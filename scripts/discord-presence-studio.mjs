import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import DiscordRPC from 'discord-rpc';
import {
  createDefaultConfig,
  createDiscordActivity,
  validateConfig,
} from './presence-config.mjs';
import {
  loadAppSecrets,
  publicSecretsStatus,
  saveAppSecrets,
  validateDiscordClientId,
  validateGiphyApiKey,
} from './app-secrets.mjs';
import { createConfigStore } from './local-config-store.mjs';
import { createCachedGiphySearch } from './giphy-search.mjs';
import {
  getScheduleState,
  nextHeartbeatDelay,
} from './presence-scheduler.mjs';
import { createWindowsAutostart } from './windows-autostart.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = dirname(scriptPath);
const args = process.argv.slice(2);
const argumentClientId = args.find((argument) => !argument.startsWith('--'));
const argumentPort = args.find((argument) => argument.startsWith('--port='));
const port = Number(argumentPort?.slice('--port='.length) || process.env.PRESENCE_STUDIO_PORT || 17345);
const shouldOpenBrowser = !args.includes('--no-open');

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Presence Studio port must be an integer between 1024 and 65535.');
  process.exit(1);
}

const htmlPath = join(scriptDirectory, 'discord-presence-studio.html');
const html = await readFile(htmlPath, 'utf8');
const dataDirectory = process.env.PRESENCE_CONFIG_PATH
  ? dirname(process.env.PRESENCE_CONFIG_PATH)
  : process.platform === 'win32' && process.env.APPDATA
    ? join(process.env.APPDATA, 'Spotify Vibe')
    : join(homedir(), '.spotify-vibe');
const configPath = process.env.PRESENCE_CONFIG_PATH || join(dataDirectory, 'presence-config.json');
const appSecretsPath = process.env.PRESENCE_SECRETS_PATH || join(dataDirectory, 'app-secrets.json');
const startupDirectory = process.env.PRESENCE_STARTUP_DIR
  || (process.env.APPDATA
    ? join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
    : null);

const configStore = createConfigStore({
  filePath: configPath,
  createDefault: createDefaultConfig,
  validate: validateConfig,
});
const loaded = await configStore.load();
let config = loaded.config;
let appSecrets = await loadAppSecrets({
  filePath: appSecretsPath,
  environmentApiKey: process.env.GIPHY_API_KEY,
  environmentGiphyApiKey: process.env.GIPHY_API_KEY,
  environmentDiscordClientId: argumentClientId || process.env.DISCORD_CLIENT_ID || '',
});

let clientId = appSecrets.discordClientId || '';
let searchConfiguredGiphy = createCachedGiphySearch({ apiKey: appSecrets.giphyApiKey });
let autostart = createWindowsAutostart({
  startupDirectory,
  scriptPath,
  nodePath: process.execPath,
  clientId: clientId || '0',
  port,
  platform: process.env.PRESENCE_AUTOSTART_DISABLE === '1' ? 'disabled' : process.platform,
});

let autostartState = {
  supported: autostart.supported,
  enabled: false,
  filePath: autostart.filePath,
};
let server;
let discordClient;
let schedulerTimer;
let reconnectTimer;
let reconnectAttempt = 0;
let discordQueue = Promise.resolve();
let isStopping = false;

const runtime = {
  connectionState: 'disconnected',
  active: false,
  desiredSceneId: null,
  desiredKey: null,
  currentSceneId: null,
  appliedKey: null,
  nextReconnectAt: null,
  lastSuccessAt: null,
  lastError: [loaded.warning, appSecrets.warning].filter(Boolean).join(' ') || null,
};

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function sceneById(sceneId) {
  return config.scenes.find((scene) => scene.id === sceneId) || null;
}

function publicConfig(value = config) {
  const settings = { ...value.settings };
  delete settings.giphyApiKey;
  delete settings.discordClientId;
  return { ...value, settings };
}

function configuredGiphyApiKey() {
  return appSecrets.giphyApiKey;
}

function gifSearchSnapshot() {
  return {
    provider: 'giphy',
    configured: Boolean(configuredGiphyApiKey()),
    source: appSecrets.giphySource,
    ownerManaged: true,
  };
}

function setupSnapshot() {
  return {
    ready: Boolean(clientId),
    needsDiscordApplicationId: !clientId,
    needsGiphyApiKey: !configuredGiphyApiKey(),
    secrets: publicSecretsStatus(appSecrets),
  };
}

function rebuildAutostart() {
  autostart = createWindowsAutostart({
    startupDirectory,
    scriptPath,
    nodePath: process.execPath,
    clientId: clientId || '0',
    port,
    platform: process.env.PRESENCE_AUTOSTART_DISABLE === '1' ? 'disabled' : process.platform,
  });
}

function activeOverride(now = new Date()) {
  if (!config.manualOverride) return null;
  return Date.parse(config.manualOverride.expiresAt) > now.getTime()
    ? config.manualOverride
    : null;
}

function scheduleSnapshot(now = new Date()) {
  return getScheduleState(config.slots, now);
}

function desiredPresence(now = new Date()) {
  const override = activeOverride(now);
  if (override) {
    return {
      scene: sceneById(override.sceneId),
      key: 'override:' + override.sceneId + ':' + override.expiresAt,
      source: 'override',
    };
  }
  if (!config.settings.scheduleEnabled) return { scene: null, key: null, source: 'paused' };
  const schedule = scheduleSnapshot(now);
  if (!schedule.activeSlot) return { scene: null, key: null, source: 'no-slots' };
  return {
    scene: sceneById(schedule.activeSlot.sceneId),
    key: 'slot:' + schedule.activeSlot.id,
    source: 'schedule',
  };
}

function runtimeSnapshot(now = new Date()) {
  const schedule = scheduleSnapshot(now);
  const override = activeOverride(now);
  const currentScene = sceneById(runtime.currentSceneId);
  const scheduledScene = sceneById(schedule.activeSlot?.sceneId);
  const nextScene = sceneById(schedule.nextSlot?.sceneId);
  return {
    connected: runtime.connectionState === 'connected',
    connectionState: runtime.connectionState,
    active: runtime.active,
    clientId: clientId || null,
    configPath,
    secretsPath: appSecretsPath,
    setup: setupSnapshot(),
    currentSceneId: runtime.currentSceneId,
    currentSceneName: currentScene?.sceneName || null,
    desiredSceneId: runtime.desiredSceneId,
    scheduledSceneId: scheduledScene?.id || null,
    scheduledSceneName: scheduledScene?.sceneName || null,
    activeSlotId: schedule.activeSlot?.id || null,
    scheduleEnabled: config.settings.scheduleEnabled,
    manualOverride: override,
    nextSwitchAt: override?.expiresAt || schedule.nextAt?.toISOString() || null,
    nextSceneId: nextScene?.id || null,
    nextSceneName: nextScene?.sceneName || null,
    nextReconnectAt: runtime.nextReconnectAt,
    lastSuccessAt: runtime.lastSuccessAt,
    lastError: runtime.lastError,
    autostart: autostartState,
    gifSearch: gifSearchSnapshot(),
    localTime: now.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time',
  };
}

function enqueueDiscord(action) {
  const operation = discordQueue.then(action, action);
  discordQueue = operation.catch(() => undefined);
  return operation;
}

async function destroyDiscordClient(candidate) {
  if (!candidate) return;
  await candidate.destroy().catch(() => undefined);
}

function stopReconnectTimer() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  runtime.nextReconnectAt = null;
}

function scheduleReconnect(error) {
  if (isStopping || reconnectTimer || !clientId) return;
  runtime.connectionState = 'disconnected';
  runtime.active = false;
  runtime.appliedKey = null;
  runtime.nextReconnectAt = null;
  if (error) {
    runtime.lastError = 'Discord Desktop is unavailable. Retrying automatically. ' + errorMessage(error);
  }

  const delay = Math.min(30_000, 1_000 * (2 ** Math.min(reconnectAttempt, 5)));
  reconnectAttempt += 1;
  runtime.nextReconnectAt = new Date(Date.now() + delay).toISOString();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    runtime.nextReconnectAt = null;
    void connectDiscord();
  }, delay);
}

function handleDisconnected(candidate, error) {
  if (isStopping || discordClient !== candidate) return;
  discordClient = undefined;
  runtime.connectionState = 'disconnected';
  runtime.active = false;
  runtime.appliedKey = null;
  scheduleReconnect(error || new Error('Discord connection closed.'));
}

async function applyScene(scene, key, { force = false } = {}) {
  runtime.desiredSceneId = scene?.id || null;
  runtime.desiredKey = key || null;
  if (!scene || runtime.connectionState !== 'connected' || !discordClient) return false;
  if (!force && runtime.active && runtime.appliedKey === key) return true;

  return enqueueDiscord(async () => {
    const candidate = discordClient;
    if (!candidate || runtime.connectionState !== 'connected') return false;
    try {
      await candidate.request('SET_ACTIVITY', {
        pid: process.pid,
        activity: createDiscordActivity(scene),
      });
      runtime.active = true;
      runtime.currentSceneId = scene.id;
      runtime.appliedKey = key;
      runtime.lastSuccessAt = new Date().toISOString();
      runtime.lastError = null;
      console.log('Presence applied: ' + scene.sceneName);
      return true;
    } catch (error) {
      runtime.lastError = 'Discord rejected the Presence update. ' + errorMessage(error);
      handleDisconnected(candidate, error);
      return false;
    }
  });
}

async function clearDiscordPresence() {
  return enqueueDiscord(async () => {
    const candidate = discordClient;
    if (!candidate || runtime.connectionState !== 'connected') {
      runtime.active = false;
      runtime.currentSceneId = null;
      runtime.appliedKey = null;
      return false;
    }
    try {
      await candidate.clearActivity();
      runtime.active = false;
      runtime.currentSceneId = null;
      runtime.appliedKey = null;
      runtime.lastSuccessAt = new Date().toISOString();
      runtime.lastError = null;
      return true;
    } catch (error) {
      runtime.lastError = 'Discord Presence could not be cleared. ' + errorMessage(error);
      handleDisconnected(candidate, error);
      return false;
    }
  });
}

async function disconnectDiscord({ clearPresence = false } = {}) {
  stopReconnectTimer();
  if (clearPresence && runtime.active) {
    await clearDiscordPresence().catch(() => undefined);
  }
  const candidate = discordClient;
  discordClient = undefined;
  runtime.connectionState = 'disconnected';
  runtime.active = false;
  runtime.appliedKey = null;
  await destroyDiscordClient(candidate);
}

async function connectDiscord() {
  if (isStopping || !clientId) {
    runtime.connectionState = 'disconnected';
    if (!clientId) {
      runtime.lastError = runtime.lastError || 'Add your Discord Application ID in API keys to connect.';
    }
    return;
  }
  if (['connecting', 'connected'].includes(runtime.connectionState)) return;
  runtime.connectionState = 'connecting';
  runtime.nextReconnectAt = null;
  const candidate = new DiscordRPC.Client({ transport: 'ipc' });
  discordClient = candidate;
  candidate.on('disconnected', () => handleDisconnected(candidate));

  try {
    await candidate.login({ clientId });
    if (isStopping || discordClient !== candidate) {
      await destroyDiscordClient(candidate);
      return;
    }
    runtime.connectionState = 'connected';
    runtime.lastError = null;
    reconnectAttempt = 0;
    console.log('Connected to Discord Desktop.');
    await reconcilePresence({ force: true, reason: 'Discord connected' });
  } catch (error) {
    if (discordClient === candidate) discordClient = undefined;
    runtime.connectionState = 'disconnected';
    await destroyDiscordClient(candidate);
    scheduleReconnect(error);
  }
}

function stopSchedulerTimer() {
  if (schedulerTimer) clearTimeout(schedulerTimer);
  schedulerTimer = undefined;
}

function scheduleHeartbeat() {
  stopSchedulerTimer();
  if (isStopping) return;
  const state = scheduleSnapshot();
  const delay = nextHeartbeatDelay(state);
  schedulerTimer = setTimeout(() => {
    void reconcilePresence({ reason: 'Clock heartbeat' });
  }, delay);
}

async function persistConfig() {
  config = await configStore.save(config);
  return config;
}

async function expireOverride(now = new Date()) {
  if (!config.manualOverride) return false;
  if (Date.parse(config.manualOverride.expiresAt) > now.getTime()) return false;
  config = { ...config, manualOverride: null };
  await persistConfig();
  return true;
}

async function reconcilePresence({ force = false, reason = 'Schedule changed' } = {}) {
  if (isStopping) return false;
  const now = new Date();
  await expireOverride(now);
  const desired = desiredPresence(now);
  runtime.desiredSceneId = desired.scene?.id || null;
  runtime.desiredKey = desired.key;
  let applied = false;
  if (desired.scene) {
    applied = await applyScene(desired.scene, desired.key, { force });
  }
  scheduleHeartbeat();
  if (force) console.log(reason + '.');
  return applied;
}

async function syncAutostart() {
  if (!autostart.supported) {
    autostartState = { supported: false, enabled: false, filePath: null };
    return autostartState;
  }
  if (!clientId) {
    try {
      if (await autostart.isEnabled()) await autostart.setEnabled(false);
    } catch {
      // Ignore cleanup failures when Discord is not configured yet.
    }
    autostartState = { supported: true, enabled: false, filePath: autostart.filePath };
    return autostartState;
  }
  try {
    autostartState = await autostart.setEnabled(config.settings.autostartEnabled);
    return autostartState;
  } catch (error) {
    autostartState = {
      supported: true,
      enabled: await autostart.isEnabled().catch(() => false),
      filePath: autostart.filePath,
    };
    runtime.lastError = 'Windows automatic startup could not be updated. ' + errorMessage(error);
    return autostartState;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 262_144) throw new Error('Request body is too large.');
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

function openBrowser(url) {
  const command = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

async function updateScenesAndSlots(body) {
  const sceneIds = new Set((Array.isArray(body.scenes) ? body.scenes : []).map((scene) => scene.id));
  const manualOverride = config.manualOverride && sceneIds.has(config.manualOverride.sceneId)
    ? config.manualOverride
    : null;
  config = validateConfig({
    ...config,
    scenes: body.scenes,
    slots: body.slots,
    manualOverride,
  });
  await persistConfig();
  await reconcilePresence({ force: true, reason: 'Configuration saved' });
  return config;
}

async function setScheduleEnabled(enabled) {
  config = validateConfig({
    ...config,
    settings: { ...config.settings, scheduleEnabled: Boolean(enabled) },
    manualOverride: enabled ? config.manualOverride : null,
  });
  await persistConfig();
  if (enabled) {
    await reconcilePresence({ force: true, reason: 'Daily schedule resumed' });
  } else {
    stopSchedulerTimer();
  }
}

async function setManualOverride(sceneId) {
  if (!clientId) throw new Error('Add your Discord Application ID in API keys before showing a Scene on Discord.');
  const scene = sceneById(sceneId);
  if (!scene) throw new Error('Choose an existing Scene.');
  const schedule = scheduleSnapshot();
  if (!schedule.nextAt) throw new Error('Add at least one enabled Daily Time Slot before using an override.');
  config = validateConfig({
    ...config,
    settings: { ...config.settings, scheduleEnabled: true },
    manualOverride: {
      sceneId,
      expiresAt: schedule.nextAt.toISOString(),
    },
  });
  await persistConfig();
  return reconcilePresence({ force: true, reason: 'Manual Override started' });
}

async function cancelManualOverride() {
  config = validateConfig({ ...config, manualOverride: null });
  await persistConfig();
  return reconcilePresence({ force: true, reason: 'Manual Override cancelled' });
}

async function setAutostartEnabled(enabled) {
  if (!autostart.supported) throw new Error('Windows automatic startup is unavailable in this environment.');
  if (!clientId) throw new Error('Add your Discord Application ID before enabling Start with Windows.');
  config = validateConfig({
    ...config,
    settings: { ...config.settings, autostartEnabled: Boolean(enabled) },
  });
  await persistConfig();
  await syncAutostart();
}

async function pauseAndClear() {
  config = validateConfig({
    ...config,
    settings: { ...config.settings, scheduleEnabled: false },
    manualOverride: null,
  });
  await persistConfig();
  stopSchedulerTimer();
  runtime.desiredSceneId = null;
  runtime.desiredKey = null;
  await clearDiscordPresence();
}

async function applySavedSecrets(saved, { reconnectDiscord = false } = {}) {
  const previousClientId = clientId;
  appSecrets = await loadAppSecrets({
    filePath: appSecretsPath,
    environmentApiKey: process.env.GIPHY_API_KEY,
    environmentGiphyApiKey: process.env.GIPHY_API_KEY,
    environmentDiscordClientId: process.env.DISCORD_CLIENT_ID || '',
  });

  // Prefer freshly saved values when environment is not overriding them.
  if (!process.env.GIPHY_API_KEY) {
    appSecrets.giphyApiKey = saved.giphyApiKey;
    appSecrets.giphySource = saved.giphySource;
    appSecrets.source = saved.giphySource;
  }
  if (!process.env.DISCORD_CLIENT_ID) {
    appSecrets.discordClientId = saved.discordClientId;
    appSecrets.discordSource = saved.discordSource;
  }

  clientId = appSecrets.discordClientId || '';
  searchConfiguredGiphy = createCachedGiphySearch({ apiKey: appSecrets.giphyApiKey });
  rebuildAutostart();
  await syncAutostart();

  if (reconnectDiscord || previousClientId !== clientId) {
    await disconnectDiscord({ clearPresence: Boolean(previousClientId) });
    reconnectAttempt = 0;
    if (clientId) {
      runtime.lastError = null;
      void connectDiscord();
    } else {
      runtime.lastError = 'Add your Discord Application ID in API keys to connect.';
    }
  }
}

async function updateSecretsFromBody(body) {
  const updates = {};
  let reconnectDiscord = false;

  if (Object.hasOwn(body, 'discordClientId')) {
    const nextId = validateDiscordClientId(body.discordClientId);
    if (!nextId) {
      updates.clearDiscordClientId = true;
      reconnectDiscord = true;
    } else {
      updates.discordClientId = nextId;
      reconnectDiscord = nextId !== clientId;
    }
  }

  if (Object.hasOwn(body, 'giphyApiKey')) {
    const nextKey = validateGiphyApiKey(body.giphyApiKey);
    if (!nextKey) updates.clearGiphyApiKey = true;
    else updates.giphyApiKey = nextKey;
  }

  if (!Object.keys(updates).length) {
    throw new Error('Provide a Discord Application ID or GIPHY API key to save.');
  }

  const saved = await saveAppSecrets({ filePath: appSecretsPath, ...updates });
  await applySavedSecrets(saved, { reconnectDiscord });
  return saved;
}

async function stop(exitCode = 0) {
  if (isStopping) return;
  isStopping = true;
  stopSchedulerTimer();
  stopReconnectTimer();

  if (server?.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (runtime.active) await clearDiscordPresence().catch(() => undefined);
  const candidate = discordClient;
  discordClient = undefined;
  await destroyDiscordClient(candidate);
  console.log('\nPresence Studio stopped.');
  process.exit(exitCode);
}

process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());

server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://' + (request.headers.host || '127.0.0.1'));

  try {
    if (request.method === 'GET' && url.pathname === '/') {
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(html);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/favicon.ico') {
      response.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
      response.end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/config') {
      sendJson(response, 200, publicConfig());
      return;
    }

    if (request.method === 'PUT' && url.pathname === '/api/config') {
      const saved = await updateScenesAndSlots(await readJson(request));
      sendJson(response, 200, { ok: true, config: publicConfig(saved), runtime: runtimeSnapshot() });
      return;
    }

    if (request.method === 'GET' && ['/api/state', '/api/presence'].includes(url.pathname)) {
      const snapshot = runtimeSnapshot();
      sendJson(response, 200, {
        ...snapshot,
        presence: sceneById(runtime.currentSceneId),
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/settings') {
      sendJson(response, 200, {
        ok: true,
        setup: setupSnapshot(),
        runtime: runtimeSnapshot(),
      });
      return;
    }

    if (request.method === 'PUT' && url.pathname === '/api/settings') {
      await updateSecretsFromBody(await readJson(request));
      sendJson(response, 200, {
        ok: true,
        setup: setupSnapshot(),
        runtime: runtimeSnapshot(),
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/override') {
      const body = await readJson(request);
      const applied = await setManualOverride(String(body.sceneId || ''));
      sendJson(response, 200, { ok: true, applied, runtime: runtimeSnapshot() });
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/api/override') {
      const applied = await cancelManualOverride();
      sendJson(response, 200, { ok: true, applied, runtime: runtimeSnapshot() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/schedule') {
      const body = await readJson(request);
      await setScheduleEnabled(Boolean(body.enabled));
      sendJson(response, 200, { ok: true, runtime: runtimeSnapshot() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/autostart') {
      const body = await readJson(request);
      await setAutostartEnabled(Boolean(body.enabled));
      sendJson(response, 200, { ok: true, runtime: runtimeSnapshot() });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/gifs/search') {
      const result = await searchConfiguredGiphy({
        query: url.searchParams.get('q'),
        limit: url.searchParams.get('limit'),
        offset: url.searchParams.get('offset'),
      });
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/presence') {
      const body = await readJson(request);
      const applied = await setManualOverride(String(body.sceneId || body.id || ''));
      sendJson(response, 200, { ok: true, applied, runtime: runtimeSnapshot() });
      return;
    }

    if (request.method === 'DELETE' && url.pathname === '/api/presence') {
      await pauseAndClear();
      sendJson(response, 200, { ok: true, runtime: runtimeSnapshot() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/quit') {
      sendJson(response, 200, { ok: true });
      setTimeout(() => void stop(), 50);
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    const message = errorMessage(error);
    const statusCode = Number(error?.statusCode)
      || (/Discord Presence could not|could not be updated/i.test(message) ? 500 : 400);
    sendJson(response, statusCode, {
      ok: false,
      error: message,
      code: error?.code || null,
      runtime: runtimeSnapshot(),
    });
  }
});

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    const studioUrl = 'http://127.0.0.1:' + port;
    console.log('Presence Studio is already running at ' + studioUrl);
    if (shouldOpenBrowser) openBrowser(studioUrl);
    process.exit(0);
  }
  console.error('Presence Studio server failed: ' + errorMessage(error));
  process.exit(1);
});

server.listen(port, '127.0.0.1', async () => {
  const studioUrl = 'http://127.0.0.1:' + port;
  console.log('\nPresence Studio is ready.');
  console.log(studioUrl);
  console.log('Configuration: ' + configPath);
  console.log('Secrets: ' + appSecretsPath);
  if (!clientId) {
    console.log('First-run setup: open Studio and add your Discord Application ID under API keys.');
  } else {
    console.log('Discord Application ID: configured');
  }
  console.log('Daily Time Slots keep running after the browser closes.');
  console.log('Press Ctrl+C to stop.\n');

  await syncAutostart();
  await expireOverride();
  scheduleHeartbeat();
  void connectDiscord();
  if (shouldOpenBrowser) openBrowser(studioUrl);
});
