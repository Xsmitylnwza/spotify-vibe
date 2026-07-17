import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function quoteCommandArgument(value) {
  return '"' + String(value).replaceAll('"', '\\"') + '"';
}

function quoteVbsString(value) {
  return '"' + String(value).replaceAll('"', '""') + '"';
}

export function createWindowsAutostart({
  appName = 'Spotify Vibe Presence',
  startupDirectory,
  scriptPath,
  nodePath,
  clientId,
  port,
  platform = process.platform,
}) {
  const supported = platform === 'win32' && Boolean(startupDirectory);
  const filePath = supported ? join(startupDirectory, appName + '.vbs') : null;

  function scriptContents() {
    const command = [
      quoteCommandArgument(nodePath),
      quoteCommandArgument(scriptPath),
      quoteCommandArgument(clientId),
      '--no-open',
      '--port=' + port,
    ].join(' ');
    return [
      'Set shell = CreateObject("WScript.Shell")',
      'shell.Run ' + quoteVbsString(command) + ', 0, False',
      '',
    ].join('\r\n');
  }

  async function isEnabled() {
    if (!supported) return false;
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async function setEnabled(enabled) {
    if (!supported) {
      return { supported: false, enabled: false, filePath: null };
    }
    if (enabled) {
      await mkdir(startupDirectory, { recursive: true });
      await writeFile(filePath, scriptContents(), 'utf8');
    } else {
      await rm(filePath, { force: true });
    }
    return { supported: true, enabled: await isEnabled(), filePath };
  }

  return {
    supported,
    filePath,
    isEnabled,
    setEnabled,
    scriptContents,
  };
}
