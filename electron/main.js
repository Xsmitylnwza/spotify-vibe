// Vibe Studio — Electron main process.
//
// Background-first desktop shell: the Presence Studio server (scripts/studio-server.mjs)
// runs in-process, the window is just a view onto http://127.0.0.1:PORT/.
// Closing the window hides to the tray — the companion keeps running.
// Launch-at-login is on by default (toggle in Settings).
import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell, nativeTheme } from 'electron';
import updaterPkg from 'electron-updater';
const { autoUpdater } = updaterPkg;
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { startStudioServer } from '../scripts/studio-server.mjs';
import { broadcastUpdateState, createStudioStartup, ensureDefaultLoginItem, createShutdown } from './lifecycle.mjs';
import { autoRestartAllowed, createUpdates } from './updates.mjs';
import { requireStudioSender, secureStudioNavigation } from './security.mjs';

const appDir = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const STUDIO_PORT = Number(process.env.PRESENCE_STUDIO_PORT || 17345);
const STUDIO_ORIGIN = `http://127.0.0.1:${STUDIO_PORT}`;
const SMOKE = process.argv.includes('--smoke-test');
const FIRST_RUN_SENTINEL = join(app.getPath('userData'), 'vibe-electron.json');
const THEME_FILE = join(app.getPath('userData'), 'vibe-theme.json');
const WINDOW_BG = { light: '#FAF8F5', dark: '#1e1f22' };
// Set just before a seamless update restart that happened while Studio was in the tray.
const HIDDEN_RELAUNCH_FILE = join(app.getPath('userData'), 'vibe-relaunch-hidden.json');

let mainWindow = null;
let tray = null;
let studioHandle = null;
let appQuitting = false;
let exitReady = false;
let updateTimer = null;
let updateInterval = null;

// ---------------------------------------------------------------------------
// single instance
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  const updates = createUpdates({
    updater: autoUpdater, currentVersion: app.getVersion(), enabled: app.isPackaged,
    publish: pushUpdateState, restart: () => quitApp({ restart: true }),
    installFailed: error => shutdown.installFailed(error),
    autoDownload: true,
  });
  let studioLoaded = false;
  // A seamless update that started from the tray relaunches back into the tray (marker < 10 min old).
  const relaunchedHidden = (() => {
    if (!process.argv.includes('--updated') || !existsSync(HIDDEN_RELAUNCH_FILE)) return false;
    try { return Date.now() - JSON.parse(readFileSync(HIDDEN_RELAUNCH_FILE, 'utf8')).at < 10 * 60 * 1000; }
    catch { return false; }
    finally { try { unlinkSync(HIDDEN_RELAUNCH_FILE); } catch { /* already gone */ } }
  })();

  // Last theme the Studio reported, so the window and splash paint in it before load.
  function savedTheme() {
    try {
      const theme = JSON.parse(readFileSync(THEME_FILE, 'utf8')).theme;
      if (theme === 'dark' || theme === 'light') return theme;
    } catch { /* first run */ }
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  app.on('second-instance', () => showWindow());

  // -------------------------------------------------------------------------
  // login item (launch at startup, on by default)
  // -------------------------------------------------------------------------
  function openedHidden() {
    if (SMOKE) return false;
    if (process.argv.includes('--hidden')) return true;
    if (relaunchedHidden) return true;
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
      backgroundColor: WINDOW_BG[savedTheme()],
      webPreferences: {
        preload: join(appDir, 'preload.cjs'),
        contextIsolation: true,
        sandbox: false,
      },
    });
    secureStudioNavigation(mainWindow, STUDIO_ORIGIN, shell);
    mainWindow.on('close', (event) => {
      if (!appQuitting) {
        event.preventDefault();
        if (tray) mainWindow.hide();
        else void quitApp();
      }
    });
    mainWindow.on('closed', () => {
      mainWindow = null;
      studioLoaded = false;
    });
    // Hiding to the tray is the moment to apply a ready update.
    mainWindow.on('hide', () => maybeAutoRestart());
    mainWindow.on('maximize', () => mainWindow.webContents.send('vibe:maximize-changed', true));
    mainWindow.on('unmaximize', () => mainWindow.webContents.send('vibe:maximize-changed', false));
    return mainWindow;
  }

  function loadStudio() {
    studioLoaded = true;
    mainWindow.loadURL(studioHandle.url + '#/status').catch(() => { studioLoaded = false; });
  }

  // Skeleton of the Studio layout, painted before the local server is ready.
  function showSplash() {
    createWindow();
    mainWindow.loadFile(join(appDir, 'splash.html'), { query: { theme: savedTheme() } }).catch(() => {});
    mainWindow.once('ready-to-show', () => { if (!appQuitting && !studioLoaded) mainWindow?.show(); });
  }

  function showWindow() {
    if (!studioHandle || appQuitting) return;
    if (!mainWindow) createWindow();
    if (!studioLoaded) loadStudio();
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
        label: updates.snapshot().state === 'available'
          ? `Download update (${updates.snapshot().availableVersion})`
          : 'Check for updates',
        click: () => {
          showWindow();
          if (updates.snapshot().state === 'available') void updates.download();
          else void checkForUpdates();
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
  function pushUpdateState(state) {
    broadcastUpdateState(BrowserWindow.getAllWindows(), state);
    refreshTray();
    if (state.state === 'downloaded') setTimeout(maybeAutoRestart, 3_000);
  }

  // Discord-style: install silently and relaunch while the owner is not using Studio.
  function maybeAutoRestart() {
    if (appQuitting || !autoRestartAllowed(updates.snapshot(), mainWindow)) return;
    try { writeFileSync(HIDDEN_RELAUNCH_FILE, JSON.stringify({ at: Date.now() })); } catch { /* relaunch visible */ }
    void updates.restartToUpdate();
  }

  function checkForUpdates() { return updates.check(); }

  function wireAutoUpdater() {
    if (!app.isPackaged) return;
    // Delayed first check + hourly; a found update downloads in the background.
    updateTimer = setTimeout(() => void checkForUpdates(), 20_000);
    updateInterval = setInterval(() => void checkForUpdates(), 60 * 60 * 1000);
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
  handleStudioIPC('vibe:get-update-state', () => updates.snapshot());
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
  handleStudioIPC('vibe:check-for-updates', () => checkForUpdates());
  handleStudioIPC('vibe:download-update', async () => {
    const result = await updates.download();
    if (result.error) throw new Error(result.error);
    return result;
  });
  handleStudioIPC('vibe:quit-and-install', () => updates.restartToUpdate());
  handleStudioIPC('vibe:set-theme', (_event, theme) => {
    if (theme !== 'dark' && theme !== 'light') return false;
    writeFileSync(THEME_FILE, JSON.stringify({ theme }));
    mainWindow?.setBackgroundColor(WINDOW_BG[theme]);
    return true;
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
      clearTimeout(updateTimer);
      clearInterval(updateInterval);
      await startup.stop();
      tray?.destroy();
    },
    quit: () => { exitReady = true; app.quit(); },
    // Silent NSIS install (no wizard) that relaunches the app with --updated.
    install: () => { exitReady = true; return autoUpdater.quitAndInstall(true, true); },
    onError: (error) => {
      updates.fail(error);
      console.error('Vibe Studio shutdown:', error?.message || 'Shutdown failed');
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
    if (!SMOKE && !openedHidden()) showSplash();
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

    if (!mainWindow) createWindow();
    createTray();
    wireAutoUpdater();

    if (SMOKE) {
      await runSmokeTest();
      return;
    }
    if (!tray || !openedHidden()) showWindow();
    else loadStudio();
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
