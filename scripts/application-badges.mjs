const base = 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/1e3bdbfdd3e56b671f9b1f99f07f2cce43bdba1d/apps/';
const icons = { 'codex':'codex.png', 'google chrome':'google-chrome.png', 'discord':'discord.png', 'dock_64':'dock-64.png', 'pomodoro-keshi':'pomodoro-keshi.png', 'file explorer':'file-explorer.png', 'windows settings':'windows-settings.png', 'willow voice':'willow-voice.png', 'zed':'zed.png' };

export function applicationBadge(executable, name = '') {
  const path = String(executable || '').replaceAll('/', '\\');
  if (/\\RobloxPlayerBeta\.exe$/i.test(path)) return 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/7202b72685d7957148db782f176005a62ec76c94/apps/roblox.png';
  if (/\\OpenAI\.Codex_[^\\]+\\app\\ChatGPT\.exe$/i.test(path)) return base + 'codex.png';
  if (/\\Discord\\app-[^\\]+\\Discord\.exe$/i.test(path)) return base + 'discord.png';
  return icons[name.toLowerCase()] ? base + icons[name.toLowerCase()] : null;
}

export function withApplicationBadge(scene, mapping) {
  const badge = applicationBadge(mapping?.executable, mapping?.name);
  const named = mapping?.name ? { ...scene, activityName:mapping.name } : scene;
  return badge ? { ...named, smallImage:badge, smallImageText:mapping.name, smallImageUrl:'' } : named;
}

