export function appKey(path) {
  // Keep installation, architecture, publisher and executable identity; ignore only Codex's package version.
  return String(path || '').trim().replaceAll('/', '\\').toLowerCase()
    .replace(/(\\windowsapps\\openai\.codex_)\d+\.\d+\.\d+\.\d+(_[^\\]+\\app\\chatgpt\.exe)$/, '$1version$2');
}

export function validateMappings(value, sceneIds) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw new Error('Use at most 100 application mappings.');
  const seen = new Set();
  return value.map(item => {
    const executable = String(item.executable || '').trim();
    const key = appKey(executable);
    if (!/^[a-z]:\\.+\.exe$/i.test(key) || executable.length > 1024) throw new Error('Choose a full Windows executable path.');
    if (seen.has(key)) throw new Error('Each application can have only one preset.');
    seen.add(key);
    if (!sceneIds.has(item.sceneId)) throw new Error('An application references a missing preset. Remove or reassign its mapping first.');
    return { executable, name: String(item.name || executable.split(/[\\/]/).at(-1)).slice(0,80), sceneId:item.sceneId, enabled:item.enabled !== false };
  });
}

export function selectAppPreset(mappings, foreground) {
  if (!foreground) return null;
  return mappings.find(item => item.enabled && appKey(item.executable) === appKey(foreground)) || null;
}

export function selectRunningPreset(mappings, running, recent = []) {
  const open = new Set(running.map(appKey));
  const eligible = mappings.filter(item => item.enabled && open.has(appKey(item.executable)));
  for (const path of recent) {
    const match = eligible.find(item => appKey(item.executable) === appKey(path));
    if (match) return match;
  }
  return eligible[0] || null;
}

// Two or more stable observations prevent task-switching flicker.
export function createForegroundSettler(delay = 200) {
  let candidate = null, since = 0, selected = null;
  return (path, now = Date.now()) => {
    const next = appKey(path);
    if (candidate !== next) { candidate = next; since = now; }
    if (now - since >= delay) selected = next;
    return selected;
  };
}
