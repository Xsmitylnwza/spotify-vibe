import { execFile } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { saveAppSecrets } from './app-secrets.mjs';

const execFileAsync = promisify(execFile);
const dataDirectory = process.platform === 'win32' && process.env.APPDATA
  ? join(process.env.APPDATA, 'Spotify Vibe')
  : join(homedir(), '.spotify-vibe');
const filePath = process.env.PRESENCE_SECRETS_PATH || join(dataDirectory, 'app-secrets.json');
const giphyArg = process.argv.slice(2).find((argument) => !argument.startsWith('--'));

async function readClipboard() {
  if (process.platform !== 'win32') {
    throw new Error('Automatic clipboard setup currently supports Windows only. Pass the key as an argument instead.');
  }
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    'Get-Clipboard -Raw',
  ], {
    windowsHide: true,
    maxBuffer: 16_384,
  });
  return stdout.trim();
}

async function clearClipboard() {
  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    "Set-Clipboard -Value ' '",
  ], {
    windowsHide: true,
    maxBuffer: 16_384,
  });
}

try {
  const giphyApiKey = giphyArg?.trim() || await readClipboard();
  await saveAppSecrets({ filePath, giphyApiKey });
  let clipboardCleared = false;
  if (!giphyArg && process.platform === 'win32') {
    clipboardCleared = true;
    try {
      await clearClipboard();
    } catch {
      clipboardCleared = false;
    }
  }
  console.log('\nGIPHY search is configured for Spotify Vibe.');
  console.log('Private app secret: ' + filePath);
  if (clipboardCleared) console.log('The copied key was cleared from the Windows clipboard.');
  else if (!giphyArg) console.warn('The key was saved, but the Windows clipboard could not be cleared. Clear it manually.');
  console.log('You can also paste keys in Presence Studio → API keys. Restart is not required when saving there.\n');
} catch (error) {
  console.error('\nGIPHY setup failed: ' + (error instanceof Error ? error.message : String(error)));
  console.error('Create a free key at https://developers.giphy.com/dashboard/?create=true');
  console.error('Then either:');
  console.error('  1. Open Presence Studio → API keys and paste it there, or');
  console.error('  2. Copy only the key and run: npm run presence:giphy-setup');
  console.error('  3. Or pass it directly: npm run presence:giphy-setup -- YOUR_GIPHY_KEY\n');
  process.exitCode = 1;
}
