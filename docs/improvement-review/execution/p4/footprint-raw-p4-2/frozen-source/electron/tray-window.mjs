import { isOwnedStudioURL } from './security.mjs';

// Classic-script lexical bindings are readable in the page's main world.
// Do not write bindings, flush drafts, or infer cleanliness from translated text.
export async function readStudioSaveState() {
  try {
    if (document.readyState !== 'complete' || !config || !_lastSave) return 'unknown';
    if (_lastSave.state !== 'saved' || settingsFormDirty) return 'dirty';
    if (saveButton.disabled || saveSettingsButton.disabled || applyBusy) return 'in-flight';
    const chain = saveChain;
    await chain;
    // An earlier save can paint "saved" while a later queued save is pending.
    if (chain !== saveChain) return 'in-flight';
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) return 'unknown';
    const persisted = await response.json();
    if (chain !== saveChain || saveButton.disabled || saveSettingsButton.disabled || applyBusy) return 'in-flight';
    if (_lastSave.state !== 'saved' || settingsFormDirty) return 'dirty';
    if (JSON.stringify(config.scenes) !== JSON.stringify(persisted.scenes)
      || JSON.stringify(config.slots) !== JSON.stringify(persisted.slots)
      || JSON.stringify(mappingDraft) !== JSON.stringify(config.appMappings || [])) return 'dirty';
    const scene = currentScene();
    if (!scene) return 'unknown';
    const draft = formScene();
    for (const key of Object.keys(draft)) {
      // formScene hardcodes removed timer controls; legacy persisted timers
      // are not edits and must not pin every default profile in memory.
      if (key === 'timerMode' || key === 'timerMinutes') continue;
      if (JSON.stringify(draft[key]) !== JSON.stringify(scene[key] ?? (key === 'buttons' ? [] : ''))) return 'dirty';
    }
    return 'clean';
  } catch { return 'unknown'; }
}

export function createTrayWindow({ getWindow, createWindow, origin, getURL,
  canOpen = () => true, canRelease = () => true,
  probe = win => win.webContents.executeJavaScript(`(${readStudioSaveState.toString()})()`),
  graceMs = 30_000, probeTimeoutMs = 2000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer, generation = 0, stopped = false, route = '#/status';
  const alive = win => win && !win.isDestroyed() && !win.webContents.isDestroyed();
  function cancel() {
    generation++;
    clearTimer(timer);
  }
  function hidden() {
    cancel();
    const win = getWindow();
    if (stopped || !canRelease() || !alive(win) || win.isVisible()) return;
    const token = generation;
    timer = setTimer(async () => {
      let deadline;
      let state = 'unknown';
      try {
        state = await Promise.race([Promise.resolve().then(() => probe(win)), new Promise(resolve => {
          deadline = setTimer(() => resolve('unknown'), probeTimeoutMs);
        })]);
      } catch { /* Missing bindings, crashed renderer, or rejected probe: retain. */ }
      clearTimer(deadline);
      if (stopped || token !== generation || getWindow() !== win || !alive(win)
        || win.isVisible() || !canRelease()) return;
      const url = win.webContents.getURL();
      if (state === 'clean' && isOwnedStudioURL(url, origin)) {
        route = new URL(url).hash || '#/status';
        win.destroy();
      } else hidden(); // One bounded retry only while a hidden renderer exists.
    }, graceMs);
  }
  function open() {
    if (stopped || !canOpen()) return;
    cancel();
    let win = getWindow();
    if (!alive(win)) win = createWindow();
    if (!win.webContents.getURL()) void win.loadURL(getURL() + route).catch(() => {});
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
  return { hidden, open, shown: cancel, stop() { stopped = true; cancel(); } };
}
