export function isOwnedStudioURL(url, origin) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' && !parsed.username && !parsed.password && parsed.origin === origin;
  } catch { return false; }
}

// One authority rule for every privileged IPC entry point.
export function requireStudioSender(event, window, origin) {
  if (!window || window.isDestroyed() || window.webContents.isDestroyed()
    || event?.sender !== window.webContents
    || !event.senderFrame || event.senderFrame !== window.webContents.mainFrame
    || event.senderFrame.parent != null || !isOwnedStudioURL(event.senderFrame.url, origin)) {
    throw new Error('Unauthorized Studio IPC sender');
  }
}

export function secureStudioNavigation(window, origin, shell) {
  const guard = (event, url) => {
    if (!isOwnedStudioURL(url, origin)) event.preventDefault();
  };
  window.webContents.on('will-navigate', guard);
  window.webContents.on('will-redirect', guard);
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) {
        Promise.resolve(shell.openExternal(parsed.href)).catch(() => {});
      }
    } catch { /* Invalid or unsafe URLs never reach the OS. */ }
    return { action: 'deny' };
  });
}
