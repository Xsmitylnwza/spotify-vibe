import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const GIPHY_KEY_PATTERN = /^[a-zA-Z0-9_-]{20,200}$/;
const DISCORD_CLIENT_ID_PATTERN = /^\d{17,20}$/;

export function validateGiphyApiKey(value) {
  const apiKey = String(value ?? '').trim();
  if (!apiKey) return '';
  if (!GIPHY_KEY_PATTERN.test(apiKey)) {
    throw new Error('GIPHY API key must contain 20–200 letters, numbers, underscores, or hyphens.');
  }
  return apiKey;
}

export function validateDiscordClientId(value) {
  const clientId = String(value ?? '').trim();
  if (!clientId) return '';
  if (!DISCORD_CLIENT_ID_PATTERN.test(clientId)) {
    throw new Error('Discord Application ID must be a 17–20 digit number from the Discord Developer Portal.');
  }
  return clientId;
}

function emptySecrets(filePath, warning = null) {
  return {
    discordClientId: '',
    giphyApiKey: '',
    discordSource: null,
    giphySource: null,
    source: null,
    filePath,
    warning,
  };
}

function secretsFromPayload(payload, filePath, {
  environmentDiscordClientId = '',
  environmentGiphyApiKey = '',
  warning = null,
} = {}) {
  let discordClientId = '';
  let giphyApiKey = '';
  let discordSource = null;
  let giphySource = null;
  const warnings = warning ? [warning] : [];

  try {
    const fromEnv = validateDiscordClientId(environmentDiscordClientId);
    if (fromEnv) {
      discordClientId = fromEnv;
      discordSource = 'environment';
    }
  } catch (error) {
    warnings.push('The DISCORD_CLIENT_ID environment value is invalid. ' + error.message);
  }

  try {
    const fromEnv = validateGiphyApiKey(environmentGiphyApiKey);
    if (fromEnv) {
      giphyApiKey = fromEnv;
      giphySource = 'environment';
    }
  } catch (error) {
    warnings.push('The GIPHY_API_KEY environment value is invalid. ' + error.message);
  }

  try {
    if (!discordClientId) {
      const fromFile = validateDiscordClientId(payload?.discordClientId);
      if (fromFile) {
        discordClientId = fromFile;
        discordSource = 'app-secret';
      }
    }
  } catch (error) {
    warnings.push('The saved Discord Application ID is invalid. ' + error.message);
  }

  try {
    if (!giphyApiKey) {
      const fromFile = validateGiphyApiKey(payload?.giphyApiKey);
      if (fromFile) {
        giphyApiKey = fromFile;
        giphySource = 'app-secret';
      }
    }
  } catch (error) {
    warnings.push('The saved GIPHY API key is invalid. ' + error.message);
  }

  return {
    discordClientId,
    giphyApiKey,
    discordSource,
    giphySource,
    source: giphySource,
    filePath,
    warning: warnings.length ? warnings.join(' ') : null,
  };
}

export async function loadAppSecrets({
  filePath,
  environmentApiKey = '',
  environmentGiphyApiKey = environmentApiKey,
  environmentDiscordClientId = '',
} = {}) {
  try {
    const payload = JSON.parse(await readFile(filePath, 'utf8'));
    return secretsFromPayload(payload, filePath, {
      environmentDiscordClientId,
      environmentGiphyApiKey,
    });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return secretsFromPayload({}, filePath, {
        environmentDiscordClientId,
        environmentGiphyApiKey,
      });
    }
    if (error instanceof SyntaxError) {
      // Environment credentials can still boot the app when the secrets file is corrupt.
      const recovered = secretsFromPayload({}, filePath, {
        environmentDiscordClientId,
        environmentGiphyApiKey,
        warning: 'The app-owned secrets file could not be loaded. ' + error.message,
      });
      if (recovered.discordClientId || recovered.giphyApiKey) {
        return { ...recovered, warning: null };
      }
      return recovered;
    }
    return emptySecrets(
      filePath,
      'The app-owned secrets file could not be loaded. ' + error.message,
    );
  }
}

export async function saveAppSecrets({
  filePath,
  discordClientId,
  giphyApiKey,
  clearDiscordClientId = false,
  clearGiphyApiKey = false,
} = {}) {
  let existing = {};
  try {
    existing = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Keep going with empty existing when the file is unreadable.
      existing = {};
    }
  }

  const nextDiscord = clearDiscordClientId
    ? ''
    : discordClientId === undefined
      ? validateDiscordClientId(existing.discordClientId)
      : validateDiscordClientId(discordClientId);
  const nextGiphy = clearGiphyApiKey
    ? ''
    : giphyApiKey === undefined
      ? validateGiphyApiKey(existing.giphyApiKey)
      : validateGiphyApiKey(giphyApiKey);

  if (!nextDiscord && !nextGiphy && !clearDiscordClientId && !clearGiphyApiKey) {
    throw new Error('Provide a Discord Application ID or a GIPHY API key to save.');
  }

  const payload = {
    version: 1,
    discordClientId: nextDiscord,
    giphyApiKey: nextGiphy,
  };

  const directory = dirname(filePath);
  const temporaryPath = filePath + '.tmp-' + process.pid;
  await mkdir(directory, { recursive: true });
  await writeFile(
    temporaryPath,
    JSON.stringify(payload, null, 2) + '\n',
    { encoding: 'utf8', mode: 0o600 },
  );
  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    if (!['EEXIST', 'EPERM'].includes(error?.code)) throw error;
    await rm(filePath, { force: true });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }

  return {
    discordClientId: nextDiscord,
    giphyApiKey: nextGiphy,
    discordSource: nextDiscord ? 'app-secret' : null,
    giphySource: nextGiphy ? 'app-secret' : null,
    source: nextGiphy ? 'app-secret' : null,
    filePath,
    warning: null,
  };
}

export function publicSecretsStatus(secrets) {
  return {
    filePath: secrets.filePath,
    warning: secrets.warning,
    discord: {
      configured: Boolean(secrets.discordClientId),
      source: secrets.discordSource,
      clientId: secrets.discordClientId || null,
    },
    giphy: {
      configured: Boolean(secrets.giphyApiKey),
      source: secrets.giphySource,
    },
  };
}
