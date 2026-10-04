// Host adapters keep desktop failure boundaries testable without launching Electron.
export function broadcastUpdateState(windows, state) {
  for (const win of windows) {
    try {
      if (win.isDestroyed() || win.webContents.isDestroyed()) continue;
      win.webContents.send('vibe:update-state', { ...state });
    } catch { /* A window can disappear between the guard and send. */ }
  }
}

export class StudioOwnershipError extends Error {
  constructor() {
    super('The Studio port is occupied. Close the other listener and retry. / พอร์ต Studio ถูกใช้งานอยู่ กรุณาปิดโปรแกรมที่ใช้พอร์ตแล้วลองอีกครั้ง');
    this.code = 'STUDIO_PORT_IN_USE';
  }
}

export function requireOwnedStudio(handle) {
  if (!handle || handle.alreadyRunning !== false) throw new StudioOwnershipError();
  return handle;
}

export async function startOwnedStudio(start, options) {
  return requireOwnedStudio(await start({ ...options, requireOwnership: true }));
}

// Windows ignores openAsHidden: the login entry must carry --hidden so a boot
// start goes straight to the tray, and reads must pass the same args.
export const LOGIN_ITEM = Object.freeze({ openAsHidden: true, args: Object.freeze(['--hidden']) });

export function ensureDefaultLoginItem({ app, fs, sentinel, env }) {
  if (!app.isPackaged || env.PRESENCE_AUTOSTART_DISABLE === '1') return false;
  try {
    const mark = () => fs.writeFileSync(sentinel, JSON.stringify({ loginItemDefaultApplied: true, hiddenArgs: true }));
    if (fs.existsSync(sentinel)) {
      // A sentinel also preserves an owner's explicit opt-out on later runs.
      let saved = {};
      try { saved = JSON.parse(fs.readFileSync(sentinel, 'utf8')); } catch { /* treat as old */ }
      if (saved.hiddenArgs) return false;
      // One-time move of an enabled pre-1.0.18 entry (no --hidden) to a background start.
      const enabled = app.getLoginItemSettings().openAtLogin;
      if (enabled) app.setLoginItemSettings({ openAtLogin: true, ...LOGIN_ITEM });
      mark();
      return enabled ? 'migrated' : false;
    }
    app.setLoginItemSettings({ openAtLogin: true, ...LOGIN_ITEM });
    mark();
    return true;
  } catch { return false; }
}

export function createShutdown({ stop, quit, install, onError = () => {}, installTimeoutMs = 5000 }) {
  let pending;
  let installing = false, quitCalled = false, installTimer;
  const quitOnce = () => {
    if (quitCalled) return;
    quitCalled = true;
    installing = false;
    clearTimeout(installTimer);
    quit();
  };
  const installFailed = (error) => {
    if (!installing) return false;
    installing = false;
    clearTimeout(installTimer);
    onError(error);
    // Cleanup has finished, but pending may still be inside install().
    // Bypass the cached request and quit once that call unwinds.
    void pending.then(quitOnce);
    return true;
  };
  const shutdown = ({ restart = false } = {}) => {
    if (pending) {
      if (!restart && installing) void pending.then(quitOnce);
      return pending;
    }
    // Defer work until pending is assigned, including reentrant OS quit events.
    pending = Promise.resolve().then(async () => {
      try { await stop(); } catch (error) { onError(error); }
      if (restart) {
        installing = true;
        installTimer = setTimeout(() => installFailed(new Error('Update install timed out')), installTimeoutMs);
        try {
          const result = await install();
          if (result === false) installFailed(new Error('Update install failed'));
        } catch (error) { installFailed(error); }
      } else quitOnce();
    });
    return pending;
  };
  shutdown.installFailed = installFailed;
  shutdown.exitObserved = () => { installing = false; clearTimeout(installTimer); };
  return shutdown;
}

export function createStudioStartup({ start, onError = () => {}, startupTimeoutMs = 15000, shutdownWaitMs = 1000, cleanupTimeoutMs = 4000 }) {
  let cancelled = false, handle = null, pending = null;
  const stopped = new WeakMap();
  function stopOnce(value) {
    if (!stopped.has(value)) stopped.set(value, Promise.resolve().then(() => value.stop()));
    return stopped.get(value);
  }
  async function begin(options) {
    if (cancelled) return null;
    let expired = false, timer;
    const raw = startOwnedStudio(start, options).then(async value => {
      // Retain the handle even when startup lost the cancellation/deadline race.
      // Shutdown must await its existing stop promise before native exit.
      handle = value;
      if (cancelled || expired) {
        try { await stopOnce(value); } catch (error) { onError(error); }
        return null;
      }
      return value;
    });
    pending = Promise.race([raw, new Promise((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        reject(Object.assign(new Error('Studio startup timed out'), { code: 'STUDIO_START_TIMEOUT' }));
      }, startupTimeoutMs);
    })]);
    try { return await pending; } finally { clearTimeout(timer); }
  }
  async function stop() {
    cancelled = true;
    let timer;
    try {
      await Promise.race([pending?.catch(() => {}), new Promise(resolve => { timer = setTimeout(resolve, shutdownWaitMs); })]);
    } finally { clearTimeout(timer); }
    if (handle) {
      // Server stop is bounded, but keep a host-level safety deadline too.
      // Total shutdown wait is at most shutdownWaitMs + cleanupTimeoutMs.
      try {
        await Promise.race([stopOnce(handle), new Promise((_, reject) => {
          timer = setTimeout(() => reject(Object.assign(new Error('Studio cleanup timed out'), { code: 'STUDIO_STOP_TIMEOUT' })), cleanupTimeoutMs);
        })]);
      } finally { clearTimeout(timer); }
    }
  }
  return { begin, stop };
}

export async function runUpdateOperation(state, publish, operation, stage) {
  state.error = null;
  state[stage] = true;
  publish();
  try {
    await operation();
    return { ok: true };
  } catch (error) {
    state.error = error?.message || 'Update failed';
    return { ok: false, error: state.error };
  } finally {
    state[stage] = false;
    publish();
  }
}
