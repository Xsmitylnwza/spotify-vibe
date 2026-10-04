// Shared production updater logic; host adapters keep feed and shutdown testable.
// autoDownload: a found update downloads in the background and installs on quit;
// restarting into it early stays an explicit owner action.
export function createUpdates({ updater, currentVersion, enabled, publish, restart, installFailed = () => false, checkTimeoutMs = 60_000, autoDownload = false }) {
  const value = { currentVersion, state: 'idle', availableVersion: null, percent: 0, error: null };
  let pending = null;
  const snapshot = () => ({
    ...value,
    // Compatibility for the existing banner while the sidebar migrates.
    available: value.availableVersion,
    checking: value.state === 'checking', downloading: value.state === 'downloading',
    downloaded: value.state === 'downloaded', progress: value.percent,
  });
  const emit = () => publish(snapshot());
  const fail = error => {
    value.state = 'error';
    value.error = error?.message || 'Update failed';
    emit();
  };
  if (enabled) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = autoDownload;
    updater.logger = null;
    updater.on('update-available', info => {
      Object.assign(value, { state: 'available', availableVersion: info.version, percent: 0, error: null });
      emit();
    });
    updater.on('update-not-available', () => {
      Object.assign(value, { state: 'idle', availableVersion: null, percent: 0, error: null });
      emit();
    });
    updater.on('download-progress', progress => {
      value.state = 'downloading';
      value.percent = Math.max(0, Math.min(100, Math.round(progress?.percent || 0)));
      emit();
    });
    updater.on('update-downloaded', info => {
      Object.assign(value, { state: 'downloaded', availableVersion: info.version, percent: 100, error: null });
      emit();
    });
    updater.on('error', error => { if (!installFailed(error)) fail(error); });
  }
  function operation(stage, run) {
    if (pending) return pending;
    value.state = stage;
    value.error = null;
    emit();
    pending = Promise.resolve().then(run).then(() => ({ ok: true }), error => {
      fail(error);
      return { ok: false, error: value.error };
    }).finally(() => {
      pending = null;
      // Events usually finish the state; adapters that emit no event must settle too.
      if (value.state === stage) { value.state = value.availableVersion ? 'available' : 'idle'; emit(); }
    });
    return pending;
  }
  function download() {
    // Joining an in-flight download keeps manual and automatic requests single.
    if (pending && value.state === 'downloading') return pending;
    if (!enabled || pending || !value.availableVersion || value.state === 'downloaded') return Promise.resolve({ ok: false });
    value.percent = 0;
    return operation('downloading', () => updater.downloadUpdate());
  }
  return {
    snapshot, fail, download,
    check() {
      // A scheduled check must never invalidate a downloaded installer or download.
      if (!enabled || pending || value.state === 'downloaded') return Promise.resolve({ ok: false });
      const checked = operation('checking', async () => {
        let timer;
        try {
          await Promise.race([updater.checkForUpdates(), new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('update check timed out')), checkTimeoutMs);
          })]);
        } finally { clearTimeout(timer); }
      });
      if (!autoDownload) return checked;
      return checked.then(result => (result.ok && value.state === 'available' ? download() : result));
    },
    restartToUpdate() {
      if (!enabled || value.state !== 'downloaded') return { ok: false };
      return restart();
    },
  };
}

// Seamless updates: a downloaded update installs silently and relaunches on its
// own, but only while Studio is hidden in the tray (or has no window).
export function autoRestartAllowed(state, window) {
  if (state?.state !== 'downloaded') return false;
  return !window || window.isDestroyed?.() || !window.isVisible();
}
