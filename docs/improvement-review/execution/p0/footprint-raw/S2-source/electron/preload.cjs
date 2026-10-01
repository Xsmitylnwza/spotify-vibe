// Vibe Studio — preload bridge (CommonJS so it loads regardless of package type).
// Exposes a minimal, read-only-ish API to the renderer. No Node access leaks.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vibeStudio', {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke('vibe:get-version'),
  getUpdateState: () => ipcRenderer.invoke('vibe:get-update-state'),
  getOpenAtLogin: () => ipcRenderer.invoke('vibe:get-open-at-login'),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke('vibe:set-open-at-login', Boolean(enabled)),
  checkForUpdates: () => ipcRenderer.invoke('vibe:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('vibe:download-update'),
  quitAndInstall: () => ipcRenderer.invoke('vibe:quit-and-install'),
  quit: () => ipcRenderer.invoke('vibe:quit'),
  openStudio: () => ipcRenderer.invoke('vibe:open-studio'),
  // Frameless window controls for the custom title bar.
  windowMinimize: () => ipcRenderer.invoke('vibe:window-minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('vibe:window-toggle-maximize'),
  windowClose: () => ipcRenderer.invoke('vibe:window-close'),
  isMaximized: () => ipcRenderer.invoke('vibe:is-maximized'),
  onMaximizeChanged: (callback) => {
    const handler = (_event, maximized) => callback(maximized);
    ipcRenderer.on('vibe:maximize-changed', handler);
    return () => ipcRenderer.removeListener('vibe:maximize-changed', handler);
  },
  onUpdateState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('vibe:update-state', handler);
    return () => ipcRenderer.removeListener('vibe:update-state', handler);
  },
});
