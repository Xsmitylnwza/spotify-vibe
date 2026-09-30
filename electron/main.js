// Vibe Studio — Electron main process.
//
// Background-first desktop shell: the Presence Studio server (scripts/studio-server.mjs)
// runs in-process, the window is just a view onto http://127.0.0.1:PORT/.
// Closing the window hides to the tray — the companion keeps running.
// Launch-at-login is on by default (toggle in Settings).
import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron';
import updaterPkg from 'electron-updater';
const { autoUpdater } = updaterPkg;
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { startStudioServer } from '../scripts/studio-server.mjs';

const appDir = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const STUDIO_PORT = Number(process.env.PRESENCE_STUDIO_PORT || 17345);
const SMOKE = process.argv.includes('--smoke-test');
const FIRST_RUN_SENTINEL = join(app.getPath('userData'), 'vibe-electron.json');

let mainWindow = null;
let tray = null;
let studioHandle = null;
let appQuitting = false;
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
  function ensureDefaultLoginItem() {
    try {
      if (!existsSync(FIRST_RUN_SENTINEL)) {
        app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
        writeFileSync(FIRST_RUN_SENTINEL, JSON.stringify({ loginItemDefaultApplied: true }));
      }
    } catch {
      /* non-fatal: user can toggle in Settings */
    }
  }

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
      backgroundColor: '#FAF8F5',
      webPreferences: {
        preload: join(appDir, 'preload.cjs'),
        contextIsolation: true,
        sandbox: false,
      },
    });
    mainWindow.on('close', (event) => {
      if (!appQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    return mainWindow;
  }

  function showWindow() {
    if (!mainWindow) createWindow();
    if (!mainWindow.webContents.getURL()) {
      mainWindow.loadURL(studioHandle.url + '#/status').catch(() => {});
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }

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
    const payload = { ...updateState };
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('vibe:update-state', payload).catch?.(() => {});
    }
    refreshTray();
  }

  async function checkForUpdates(manual = false) {
    if (!app.isPackaged || updateState.checking) return;
    updateState.checking = true;
    updateState.error = null;
    if (manual) pushUpdateState();
    try {
      // Never leave `checking` stuck: a hung updater promise used to make
      // every later manual check silently no-op (dead button).
      await Promise.race([
        autoUpdater.checkForUpdates(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('update check timed out')), 60_000)),
      ]);
    } catch {
      // No releases published yet, offline, timed out, etc. — stay quiet, retry later.
      updateState.error = 'unreachable';
    } finally {
      updateState.checking = false;
      pushUpdateState();
    }
  }

  function wireAutoUpdater() {
    if (!app.isPackaged) return; // no feed in dev
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
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
    autoUpdater.on('error', () => {
      updateState.error = 'unreachable';
      updateState.checking = false;
      updateState.downloading = false;
      pushUpdateState();
    });
    // Delayed first check + every 6h.
    setTimeout(() => void checkForUpdates(false), 20_000);
    setInterval(() => void checkForUpdates(false), 6 * 60 * 60 * 1000);
  }

  // -------------------------------------------------------------------------
  // IPC bridge for the renderer (preload.cjs)
  // -------------------------------------------------------------------------
  ipcMain.handle('vibe:get-version', () => app.getVersion());
  ipcMain.handle('vibe:get-update-state', () => ({ ...updateState }));
  ipcMain.handle('vibe:get-open-at-login', () => {
    try {
      return app.getLoginItemSettings().openAtLogin;
    } catch {
      return false;
    }
  });
  ipcMain.handle('vibe:set-open-at-login', (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: true });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('vibe:check-for-updates', () => checkForUpdates(true));
  ipcMain.handle('vibe:download-update', async () => {
    if (!app.isPackaged) return { ok: false };
    updateState.downloading = true;
    updateState.progress = 0;
    pushUpdateState();
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch {
      updateState.downloading = false;
      pushUpdateState();
      throw new Error('download failed');
    }
  });
  ipcMain.handle('vibe:quit-and-install', () => {
    appQuitting = true;
    autoUpdater.quitAndInstall(false, true);
  });
  ipcMain.handle('vibe:open-studio', () => showWindow());

  async function quitApp() {
    appQuitting = true;
    try {
      await studioHandle?.stop();
    } catch {
      /* ignore */
    }
    app.quit();
  }

  app.on('window-all-closed', () => {
    // Background-first: keep running in the tray.
  });
  app.on('before-quit', () => {
    appQuitting = true;
  });
  app.on('activate', () => showWindow());

  // -------------------------------------------------------------------------
  // boot
  // -------------------------------------------------------------------------
  app.whenReady().then(async () => {
    ensureDefaultLoginItem();
    try {
      studioHandle = await startStudioServer({
        port: STUDIO_PORT,
        openBrowser: false,
        exitProcess: false,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Vibe Studio server failed to start:', error?.message || error);
      app.exit(1);
      return;
    }

    createWindow();
    createTray();
    wireAutoUpdater();

    if (SMOKE) {
      await runSmokeTest();
      return;
    }
    if (!openedHidden()) showWindow();
    else mainWindow.loadURL(studioHandle.url + '#/status').catch(() => {});
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
    await studioHandle?.stop().catch(() => {});
    app.exit(errors.length ? 1 : 0);
  }
}
