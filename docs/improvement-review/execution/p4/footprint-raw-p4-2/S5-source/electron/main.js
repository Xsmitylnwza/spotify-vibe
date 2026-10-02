// Vibe Studio — Electron main process.
//
// Background-first desktop shell: the Presence Studio server (scripts/studio-server.mjs)
// runs in-process, the window is just a view onto http://127.0.0.1:PORT/.
// Closing the window hides to the tray — the companion keeps running.
// Launch-at-login is on by default (toggle in Settings).
import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell } from 'electron';
import updaterPkg from 'electron-updater';
const { autoUpdater } = updaterPkg;
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { startStudioServer } from '../scripts/studio-server.mjs';
import { broadcastUpdateState, createStudioStartup, ensureDefaultLoginItem, createShutdown, runUpdateOperation } from './lifecycle.mjs';
import { requireStudioSender, secureStudioNavigation } from './security.mjs';
import { createTrayWindow } from './tray-window.mjs';

const appDir = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const STUDIO_PORT = Number(process.env.PRESENCE_STUDIO_PORT || 17345);
const STUDIO_ORIGIN = `http://127.0.0.1:${STUDIO_PORT}`;
const SMOKE = process.argv.includes('--smoke-test');
const FIRST_RUN_SENTINEL = join(app.getPath('userData'), 'vibe-electron.json');

let mainWindow = null;
let tray = null;
let studioHandle = null;
let appQuitting = false;
let exitReady = false;
let updateTimer = null;
let updateInterval = null;
const updateState = { available: null, downloaded: false, downloading: false, progress: 0, checking: false, error: null };

// ---------------------------------------------------------------------------
// single instance
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());

  // -------------------------------------------------------------------------
  // login item (launch at startup, on by default)
  // -------------------------------------------------------------------------
  function openedHidden() {
    if (SMOKE) return false;
    if (process.argv.includes('--hidden')) return true;
    try {
      const s = app.getLoginItemSettings();
      return Boolean(s.wasOpenedAtLogin || s.wasOpenedAsHidden);
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // window
  // -------------------------------------------------------------------------
  function createWindow() {
    // No default File/Edit/View menu bar — the Studio UI is self-contained.
    Menu.setApplicationMenu(null);
    const icon = nativeImage.createFromPath(join(appDir, 'assets', 'icon.png'));
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 860,
      minWidth: 1024,
      minHeight: 680,
      title: 'Vibe Studio',
      icon,
      show: false,
      // Frameless: the renderer draws its own slim title bar with custom
      // minimize / maximize / close controls (no OS logo bar).
      frame: false,
      backgroundColor: '#FAF8F5',
      webPreferences: {
        preload: join(appDir, 'preload.cjs'),
        contextIsolation: true,
        sandbox: false,
      },
    });
    const win = mainWindow;
    secureStudioNavigation(win, STUDIO_ORIGIN, shell);
    win.on('close', (event) => {
      if (!appQuitting) {
        event.preventDefault();
        if (tray) win.hide();
        else void quitApp();
      }
    });
    win.on('hide', () => trayWindow.hidden());
    win.on('show', () => trayWindow.shown());
    win.on('closed', () => {
      if (mainWindow === win) mainWindow = null;
    });
    const publishMaximized = value => {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send('vibe:maximize-changed', value);
    };
    win.on('maximize', () => publishMaximized(true));
    win.on('unmaximize', () => publishMaximized(false));
    return win;
  }

  const trayWindow = createTrayWindow({
    getWindow: () => mainWindow, createWindow, origin: STUDIO_ORIGIN,
    getURL: () => studioHandle.url,
    canOpen: () => Boolean(studioHandle) && !appQuitting,
    canRelease: () => Boolean(tray) && !appQuitting,
  });
  function showWindow() { trayWindow.open(); }

  // -------------------------------------------------------------------------
  // tray
  // -------------------------------------------------------------------------
  function buildTrayMenu() {
    const template = [
      { label: 'Open Vibe Studio', click: () => showWindow() },
      {
        label: updateState.available && !updateState.downloaded
          ? `Download update (${updateState.available})`
          : 'Check for updates',
        click: () => {
          showWindow();
          checkForUpdates(true);
        },
      },
      { type: 'separator' },
      { label: `Vibe Studio v${app.getVersion()}`, enabled: false },
      { type: 'separator' },
      {
        label: 'Quit Vibe Studio',
        click: () => quitApp(),
      },
    ];
    return Menu.buildFromTemplate(template);
  }

  function createTray() {
    try {
      const trayIcon = nativeImage
        .createFromPath(join(appDir, 'assets', 'tray.png'))
        .resize({ width: 22, height: 22 });
      if (process.platform === 'darwin') trayIcon.setTemplateImage(true);
      tray = new Tray(trayIcon);
      tray.setToolTip('Vibe Studio — running in background');
      tray.setContextMenu(buildTrayMenu());
      tray.on('click', () => showWindow());
      tray.on('double-click', () => showWindow());
    } catch {
      try { tray?.destroy(); } catch { /* ignore */ }
      tray = null; // headless / no tray host — the app still works
    }
  }

  function refreshTray() {
    try {
      tray?.setContextMenu(buildTrayMenu());
    } catch {
      /* ignore */
    }
  }

  // -------------------------------------------------------------------------
  // updates (electron-updater, GitHub Releases)
  // -------------------------------------------------------------------------
  function pushUpdateState() {
    broadcastUpdateState(BrowserWindow.getAllWindows(), updateState);
    refreshTray();
  }

  async function checkForUpdates(manual = false) {
    if (!app.isPackaged || updateState.checking) return;
    let timeout;
    try {
      // Never leave `checking` stuck: a hung updater promise used to make
      // every later manual check silently no-op (dead button).
      return await runUpdateOperation(updateState, pushUpdateState, () => Promise.race([
        autoUpdater.checkForUpdates(),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('update check timed out')), 60_000); }),
      ]), 'checking');
    } finally {
      clearTimeout(timeout);
    }
  }

  function wireAutoUpdater() {
    if (!app.isPackaged) return; // no feed in dev
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = null;
    autoUpdater.on('update-available', (info) => {
      updateState.available = info?.version || 'new';
      updateState.downloaded = false;
      pushUpdateState();
    });
    autoUpdater.on('update-not-available', () => {
      updateState.available = null;
      pushUpdateState();
    });
    autoUpdater.on('download-progress', (progress) => {
      updateState.downloading = true;
      updateState.progress = Math.round(progress?.percent || 0);
      pushUpdateState();
    });
    autoUpdater.on('update-downloaded', (info) => {
      updateState.available = info?.version || updateState.available;
      updateState.downloaded = true;
      updateState.downloading = false;
      updateState.progress = 100;
      pushUpdateState();
    });
    autoUpdater.on('error', (error) => {
      if (shutdown.installFailed(error)) return;
      updateState.error = error?.message || 'Update failed';
      updateState.checking = false;
      updateState.downloading = false;
      pushUpdateState();
    });
    // Delayed first check + every 6h.
    updateTimer = setTimeout(() => void checkForUpdates(false), 20_000);
    updateInterval = setInterval(() => void checkForUpdates(false), 6 * 60 * 60 * 1000);
  }

  // -------------------------------------------------------------------------
  // IPC bridge for the renderer (preload.cjs)
  // -------------------------------------------------------------------------
  function handleStudioIPC(channel, handler) {
    ipcMain.handle(channel, (event, ...args) => {
      requireStudioSender(event, mainWindow, studioHandle ? STUDIO_ORIGIN : null);
      return handler(event, ...args);
    });
  }
  handleStudioIPC('vibe:get-version', () => app.getVersion());
  handleStudioIPC('vibe:get-update-state', () => ({ ...updateState }));
  handleStudioIPC('vibe:get-open-at-login', () => {
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch {
      return false;
    }
  });
  handleStudioIPC('vibe:set-open-at-login', (_event, enabled) => {
    if (!app.isPackaged || process.env.PRESENCE_AUTOSTART_DISABLE === '1') return false;
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: true });
    writeFileSync(FIRST_RUN_SENTINEL, JSON.stringify({ loginItemDefaultApplied: true }));
    return app.getLoginItemSettings().openAtLogin;
  });
  handleStudioIPC('vibe:check-for-updates', () => checkForUpdates(true));
  handleStudioIPC('vibe:download-update', async () => {
    if (!app.isPackaged || !updateState.available || updateState.downloading || updateState.downloaded) return { ok: false };
    updateState.progress = 0;
    const result = await runUpdateOperation(updateState, pushUpdateState, () => autoUpdater.downloadUpdate(), 'downloading');
    // Electron handles this IPC rejection; the existing renderer catch shows
    // its localized download error after the state has been broadcast.
    if (!result.ok) throw new Error(result.error);
    return result;
  });
  handleStudioIPC('vibe:quit-and-install', () => {
    if (!app.isPackaged || !updateState.downloaded) return { ok: false };
    return quitApp({ restart: true });
  });
  handleStudioIPC('vibe:quit', () => quitApp());
  handleStudioIPC('vibe:open-studio', () => showWindow());
  // Frameless window controls (custom title bar in the renderer).
  handleStudioIPC('vibe:window-minimize', () => { mainWindow?.minimize(); });
  handleStudioIPC('vibe:window-toggle-maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  handleStudioIPC('vibe:is-maximized', () => mainWindow?.isMaximized() ?? false);
  // Reuse the tray-hide behavior: closing the window hides it to the tray.
  handleStudioIPC('vibe:window-close', () => { mainWindow?.close(); });

  const startup = createStudioStartup({
    start: startStudioServer,
    onError: error => console.error('Vibe Studio late cleanup:', error),
  });
  const shutdown = createShutdown({
    stop: async () => {
      trayWindow.stop();
      clearTimeout(updateTimer);
      clearInterval(updateInterval);
      await startup.stop();
      tray?.destroy();
    },
    quit: () => { exitReady = true; app.quit(); },
    install: () => { exitReady = true; return autoUpdater.quitAndInstall(false, true); },
    onError: (error) => {
      updateState.error = error?.message || 'Shutdown failed';
      pushUpdateState();
      console.error('Vibe Studio shutdown:', updateState.error);
    },
  });
  function quitApp(options) {
    appQuitting = true;
    return shutdown(options);
  }

  app.on('window-all-closed', () => {
    // Background-first: keep running in the tray.
  });
  app.on('before-quit', (event) => {
    if (exitReady) { shutdown.exitObserved(); return; }
    event.preventDefault();
    void quitApp();
  });
  app.on('activate', () => showWindow());

  // -------------------------------------------------------------------------
  // boot
  // -------------------------------------------------------------------------
  app.whenReady().then(async () => {
    ensureDefaultLoginItem({ app, fs: { existsSync, writeFileSync }, sentinel: FIRST_RUN_SENTINEL, env: process.env });
    while (!appQuitting && !studioHandle) {
      try {
        studioHandle = await startup.begin({
          port: STUDIO_PORT,
          argv: [],
          openBrowser: false,
          exitProcess: false,
          onQuit: () => quitApp(),
        });
      } catch (error) {
        console.error('Vibe Studio server failed to start:', error?.message || error);
        if (appQuitting) return;
        // A timed-out start may still own resources; do not launch a retry.
        if (error?.code === 'STUDIO_START_TIMEOUT') { await quitApp(); return; }
        const result = await dialog.showMessageBox({
          type: 'error', title: 'Vibe Studio',
          message: 'Studio could not start / ไม่สามารถเปิด Studio ได้',
          detail: `${error?.code || 'STUDIO_START_FAILED'}: ${error?.message || error}`,
          buttons: ['Retry / ลองอีกครั้ง', 'Quit / ออก'], defaultId: 0, cancelId: 1,
        });
        if (result.response !== 0) { await quitApp(); return; }
      }
    }
    if (appQuitting) return;

    createWindow();
    createTray();
    wireAutoUpdater();

    if (SMOKE) {
      await runSmokeTest();
      return;
    }
    if (!tray || !openedHidden()) showWindow();
    else {
      mainWindow.loadURL(studioHandle.url + '#/status').catch(() => {});
      trayWindow.hidden();
    }
  }).catch(async (error) => {
    console.error('Vibe Studio startup:', error?.message || error);
    await quitApp();
  });

  // -------------------------------------------------------------------------
  // headless smoke test: --smoke-test (used by CI / dev verification)
  // -------------------------------------------------------------------------
  async function runSmokeTest() {
    const errors = [];
    mainWindow.webContents.on('console-message', (_event, _level, message) => {
      if (/error/i.test(message)) errors.push(message);
    });
    mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      errors.push(`did-fail-load ${code} ${desc}`);
    });
    await mainWindow.loadURL(studioHandle.url + '#/status');
    await new Promise((resolve) => {
      const done = () => resolve();
      mainWindow.webContents.once('did-finish-load', () => setTimeout(done, 2500));
      setTimeout(done, 15000); // never hang forever
    });
    let bridge = 'missing';
    try {
      bridge = await mainWindow.webContents.executeJavaScript(
        'window.vibeStudio && window.vibeStudio.isElectron ? window.vibeStudio.getVersion() : "no-bridge"'
      );
    } catch (error) {
      errors.push('bridge eval failed: ' + (error?.message || error));
    }
    try {
      const shot = await mainWindow.capturePage();
      const shotPath = process.env.SMOKE_SHOT || '/tmp/electron-smoke.png';
      writeFileSync(shotPath, shot.toPNG());
      // eslint-disable-next-line no-console
      console.log('SMOKE screenshot=' + shotPath);
    } catch (error) {
      errors.push('screenshot failed: ' + (error?.message || error));
    }
    // eslint-disable-next-line no-console
    console.log(`SMOKE url=${studioHandle.url} bridge=${bridge} consoleErrors=${errors.length}`);
    errors.slice(0, 5).forEach((m) => console.log('SMOKE-ERR ' + m));
    try { mainWindow.destroy(); } catch { /* ignore */ }
    process.exitCode = errors.length ? 1 : 0;
    await quitApp();
  }
}
