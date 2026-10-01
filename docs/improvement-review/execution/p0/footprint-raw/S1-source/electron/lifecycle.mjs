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

export function ensureDefaultLoginItem({ app, fs, sentinel, env }) {
  if (!app.isPackaged || env.PRESENCE_AUTOSTART_DISABLE === '1') return false;
  try {
    // A sentinel also preserves an owner's explicit opt-out on later runs.
    if (fs.existsSync(sentinel)) return false;
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    fs.writeFileSync(sentinel, JSON.stringify({ loginItemDefaultApplied: true }));
    return true;
  } catch { return false; }
}

export function createShutdown({ stop, quit, install, onError = () => {} }) {
  let pending;
  return ({ restart = false } = {}) => {
    if (pending) return pending;
    // Defer work until pending is assigned, including reentrant OS quit events.
    pending = Promise.resolve().then(async () => {
      try { await stop(); } catch (error) { onError(error); }
      if (restart) {
        try { await install(); } catch (error) {
          onError(error);
          quit();
        }
      } else quit();
    });
    return pending;
  };
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
