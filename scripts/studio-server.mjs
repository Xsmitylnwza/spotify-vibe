import { codexSessionScene } from './codex-session.mjs';
import { withApplicationBadge } from './application-badges.mjs';
import { withDefaultApplication } from './discord-application.mjs';
import { appKey, selectRunningPreset } from './app-presence.mjs';
import { watchWindowsApps } from './windows-apps.mjs';
import { initInstalledApps, getInstalledApps, refreshInstalledApps } from './installed-apps.mjs';
import { characterArt, defaultArtBaseUrl } from './character-art.mjs';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
import { assertSupportedVersion, createConfigStore } from './local-config-store.mjs';
import { createCachedGiphySearch } from './giphy-search.mjs';
import {
  getScheduleState,
  nextHeartbeatDelay,
} from './presence-scheduler.mjs';
import { createWindowsAutostart } from './windows-autostart.mjs';

export async function startStudioServer(options = {}) {
  const env = options.environment ?? process.env;
  const nowDate = () => new Date(options.clock?.now?.() ?? Date.now());
  const setSchedulerTimeout = options.clock?.setTimeout ?? setTimeout;
  const clearSchedulerTimeout = options.clock?.clearTimeout ?? clearTimeout;
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDirectory = dirname(scriptPath);
  const args = options.argv ?? process.argv.slice(2);
  const argumentClientId = args.find((argument) => !argument.startsWith('--'));
  const argumentPort = args.find((argument) => argument.startsWith('--port='));
  const port = Number.isInteger(options.port) && options.port >= 1024 && options.port <= 65535
      ? options.port
      : Number(argumentPort?.slice('--port='.length) || env.PRESENCE_STUDIO_PORT || 17345);
  const shouldOpenBrowser = options.openBrowser ?? !args.includes('--no-open');
    const exitProcess = options.exitProcess !== false;
    const onLog = options.onLog ?? console.log;

  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error('Presence Studio port must be an integer between 1024 and 65535.');
    process.exit(1);
  }

  const htmlPath = join(scriptDirectory, 'discord-presence-studio.html');
  const html = await readFile(htmlPath, 'utf8');
  const dataDirectory = options.dataDirectory
    || (env.PRESENCE_CONFIG_PATH
      ? dirname(env.PRESENCE_CONFIG_PATH)
      : process.platform === 'win32' && env.APPDATA
        ? join(env.APPDATA, 'Spotify Vibe')
        : join(homedir(), '.spotify-vibe'));
  const configPath = env.PRESENCE_CONFIG_PATH || join(dataDirectory, 'presence-config.json');
  const appSecretsPath = env.PRESENCE_SECRETS_PATH || join(dataDirectory, 'app-secrets.json');
  const startupDirectory = env.PRESENCE_STARTUP_DIR
    || (env.APPDATA
      ? join(env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
      : null);

  const configStore = createConfigStore({
    fs: options.configFs,
    filePath: configPath,
    createDefault: createDefaultConfig,
    validate: validateConfig,
  });
  const loaded = await configStore.load();
  let config = loaded.config;
  let appSecrets = await loadAppSecrets({
    filePath: appSecretsPath,
    environmentApiKey: env.GIPHY_API_KEY,
    environmentGiphyApiKey: env.GIPHY_API_KEY,
    environmentDiscordClientId: argumentClientId || env.DISCORD_CLIENT_ID || '',
  });

  if (env.PRESENCE_DISABLE_DEFAULT_APPLICATION !== '1') appSecrets = withDefaultApplication(appSecrets);
  let clientId = appSecrets.discordClientId || '';
  let searchConfiguredGiphy = createCachedGiphySearch({ apiKey: appSecrets.giphyApiKey });
  let autostart = createWindowsAutostart({
    startupDirectory,
    scriptPath,
    nodePath: process.execPath,
    clientId: clientId || '0',
    port,
    platform: options.disableHostEffects || env.PRESENCE_AUTOSTART_DISABLE === '1' ? 'disabled' : process.platform,
  });

  let autostartState = {
    supported: autostart.supported,
    enabled: false,
    filePath: autostart.filePath,
  };
  const installedAppsAbort = new AbortController();
  const installedAppsOptions = { ...options.installedAppsOptions, signal: installedAppsAbort.signal };
  let stopPromise;
  let server;
  let discordClient;
  let schedulerTimer;
  let reconnectTimer;
  let reconnectAttempt = 0;
  let discordQueue = Promise.resolve();
  let isStopping = false;
  let stopAppWatcher = () => {};
  let appSnapshot = { apps:[], supported:process.platform === "win32", error:null };
  let stableForeground = null;
  let foregroundTimer;
  let foregroundCandidate;
  let recentApplications = [];
  let activityStartedAt = new Date();
  let activityIdentity = null;

  const runtime = {
    connectionState: 'disconnected',
    discordUser: null,
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

  function discordIdentity(user) {
    if (!user || !/^\d+$/.test(user.id) || !user.username) return null;
    const { id, username, avatar } = user;
    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${(BigInt(id) >> 22n) % 6n}.png`;
    return { id, username, displayName: user.global_name || username, avatarUrl };
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
      platform: options.disableHostEffects || env.PRESENCE_AUTOSTART_DISABLE === '1' ? 'disabled' : process.platform,
    });
  }

  function activeOverride(now = nowDate()) {
    if (!config.manualOverride) return null;
    return Date.parse(config.manualOverride.expiresAt) > now.getTime()
      ? config.manualOverride
      : null;
  }

  function scheduleSnapshot(now = nowDate()) {
    return getScheduleState(config.slots, now);
  }

  function desiredPresence(now = nowDate()) {
    const override = activeOverride(now);
    if (override) {
      return {
        scene: sceneById(override.sceneId),
        key: 'override:' + override.sceneId + ':' + override.expiresAt,
        source: 'override',
      };
    }
    if (!config.settings.scheduleEnabled) return { scene: null, key: null, source: 'paused' };
    if (config.settings.selectionMode === 'apps') {
      const mapping = selectRunningPreset(config.appMappings, appSnapshot.running || appSnapshot.apps.map(app => app.executable), recentApplications);
      return { scene:mapping ? codexSessionScene(withApplicationBadge(sceneById(mapping.sceneId), mapping), mapping, config.codexSession) : null,
        key:mapping ? 'app:' + mapping.executable.toLowerCase() + ':' + mapping.sceneId : null,
        source:mapping ? 'app' : 'unmapped', application:mapping?.name || null,
        session: mapping && /OpenAI\.Codex_/i.test(mapping.executable) ? config.codexSession : null };
    }
    const schedule = scheduleSnapshot(now);
    if (!schedule.activeSlot) return { scene: null, key: null, source: 'no-slots' };
    return {
      scene: sceneById(schedule.activeSlot.sceneId),
      key: 'slot:' + schedule.activeSlot.id,
      source: 'schedule',
    };
  }

  function runtimeSnapshot(now = nowDate()) {
    const schedule = scheduleSnapshot(now);
    const override = activeOverride(now);
    const currentScene = sceneById(runtime.currentSceneId);
    const scheduledScene = sceneById(schedule.activeSlot?.sceneId);
    const nextScene = sceneById(schedule.nextSlot?.sceneId);
    return {
      selectionMode: config.settings.selectionMode,
      selectionSource: desiredPresence(now).source,
      selectedApplication: desiredPresence(now).application || null,
      applicationBadge: desiredPresence(now).scene?.smallImage || null,
      selectedPresetName: desiredPresence(now).scene?.sceneName || null,
      connected: runtime.connectionState === 'connected',
      discordUser: runtime.discordUser,
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
      characterArt: { publicUrlConfigured: Boolean(env.PRESENCE_ART_BASE_URL || defaultArtBaseUrl) },
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
    runtime.discordUser = null;
    runtime.active = false;
    runtime.appliedKey = null;
    runtime.nextReconnectAt = null;
    if (error) {
      runtime.lastError = 'Discord Desktop ไม่พร้อมใช้งาน กำลังลองใหม่โดยอัตโนมัติ ' + errorMessage(error);
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
    runtime.discordUser = null;
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
      if (runtime.desiredKey !== key) return false;
      if (!force && runtime.active && runtime.appliedKey === key) return true;
      let activity;
      const artBaseUrl = env.PRESENCE_ART_BASE_URL || defaultArtBaseUrl;
      const pendingArt = !artBaseUrl && [scene.largeImage, scene.smallImage].some(value => value?.startsWith('builtin:'));
      const deliveryScene = pendingArt ? { ...scene,
        largeImage: scene.largeImage?.startsWith('builtin:') ? '' : scene.largeImage,
        smallImage: scene.smallImage?.startsWith('builtin:') ? '' : scene.smallImage,
      } : scene;
      try {
        activity = createDiscordActivity(deliveryScene, activityStartedAt, { artBaseUrl });
      } catch (error) {
        runtime.lastError = errorMessage(error);
        return false;
      }
      try {
        await candidate.request('SET_ACTIVITY', {
          pid: process.pid,
          activity,
        });
        runtime.active = true;
        runtime.currentSceneId = scene.id;
        runtime.appliedKey = key;
        runtime.lastSuccessAt = new Date().toISOString();
        runtime.lastError = pendingArt ? 'Presence ทำงานอยู่แต่ไม่มีภาพตัวละคร Hinata ต้องการ URL รูปภาพสาธารณะ' : null;
        console.log('Presence applied: ' + scene.sceneName);
        return true;
      } catch (error) {
        runtime.lastError = 'Discord ปฏิเสธการอัปเดต Presence ' + errorMessage(error);
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
        runtime.lastError = 'ล้าง Discord Presence ไม่ได้ ' + errorMessage(error);
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
    runtime.discordUser = null;
    runtime.active = false;
    runtime.appliedKey = null;
    await destroyDiscordClient(candidate);
  }

  async function connectDiscord() {
    if (options.disableHostEffects || env.PRESENCE_DISCORD_DISABLE === '1' || isStopping || !clientId) {
      runtime.connectionState = 'disconnected';
      runtime.discordUser = null;
      if (!clientId) {
        runtime.lastError = runtime.lastError || 'ใส่ Discord Application ID ที่ API keys เพื่อเชื่อมต่อ';
      }
      return;
    }
    if (['connecting', 'connected'].includes(runtime.connectionState)) return;
    runtime.connectionState = 'connecting';
    runtime.nextReconnectAt = null;
    const candidate = options.createDiscordClient ? options.createDiscordClient() : new DiscordRPC.Client({ transport: 'ipc' });
    discordClient = candidate;
    candidate.on('disconnected', () => handleDisconnected(candidate));

    try {
      await candidate.login({ clientId });
      if (isStopping || discordClient !== candidate) {
        await destroyDiscordClient(candidate);
        return;
      }
      runtime.connectionState = 'connected';
      runtime.discordUser = discordIdentity(candidate.user);
      runtime.lastError = null;
      reconnectAttempt = 0;
      console.log('Connected to Discord Desktop.');
      await reconcilePresence({ force: true, reason: 'Discord connected' });
    } catch (error) {
      if (isStopping || discordClient !== candidate) {
        await destroyDiscordClient(candidate);
        return;
      }
      discordClient = undefined;
      runtime.connectionState = 'disconnected';
      runtime.discordUser = null;
      await destroyDiscordClient(candidate);
      scheduleReconnect(error);
    }
  }

  function stopSchedulerTimer() {
    if (schedulerTimer) clearSchedulerTimeout(schedulerTimer);
    schedulerTimer = undefined;
  }

  let commandQueue = Promise.resolve();
  let expiryRetryAttempt = 0;

  // Build against the latest committed state inside the same queue as save/publish.
  function commitConfig(buildCandidate, { writeSlots = false } = {}) {
    const operation = commandQueue.then(async () => {
      const candidate = buildCandidate(config);
      if (candidate === config) return config;
      assertSupportedVersion(candidate, 2);
      const normalized = validateConfig(candidate);
      let saved;
      try { saved = await configStore.save(normalized, { writeSlots }); }
      catch (cause) {
        throw Object.assign(new Error('Configuration could not be saved.'), { code: 'CONFIG_SAVE_FAILED', statusCode: 500, cause });
      }
      config = saved;
      return config;
    });
    commandQueue = operation.catch(() => undefined);
    return operation;
  }

  function scheduleHeartbeat() {
    stopSchedulerTimer();
    if (isStopping) return;
    let delay = nextHeartbeatDelay(scheduleSnapshot());
    if (config.manualOverride) {
      const remaining = Date.parse(config.manualOverride.expiresAt) - nowDate().getTime();
      delay = Math.min(delay, remaining > 0 ? Math.max(250, remaining) : Math.min(60_000, 1_000 * (2 ** Math.min(expiryRetryAttempt, 6))));
    }
    schedulerTimer = setSchedulerTimeout(() => {
      schedulerTimer = undefined;
      return reconcilePresence({ reason: 'Clock heartbeat' }).catch(error => { runtime.lastError = errorMessage(error); });
    }, delay);
  }

  async function expireOverride(now = nowDate()) {
    await commitConfig(current => {
      if (!current.manualOverride || Date.parse(current.manualOverride.expiresAt) > now.getTime()) return current;
      return { ...current, manualOverride: null };
    });
  }

  async function reconcilePresence({ force = false, reason = 'Schedule changed' } = {}) {
    if (isStopping) return false;
    try {
      const now = nowDate();
      try { await expireOverride(now); expiryRetryAttempt = 0; }
      catch (error) {
        expiryRetryAttempt += 1;
        runtime.lastError = errorMessage(error);
        // Expired intent is already ineffective even if durable cleanup must retry.
      }
      const desired = desiredPresence(now);
      runtime.desiredSceneId = desired.scene?.id || null;
      if (desired.session) desired.key += ':session:' + desired.session.startedAt + ':' + desired.session.title;
      runtime.desiredKey = desired.key;
      if (activityIdentity !== desired.key) { activityIdentity = desired.key; activityStartedAt = desired.session ? new Date(desired.session.startedAt) : now; }
      let applied = false;
      if (desired.scene) applied = await applyScene(desired.scene, desired.key, { force });
      else if (config.settings.selectionMode === 'apps' && runtime.active) await clearDiscordPresence();
      if (force) console.log(reason + '.');
      return applied;
    } finally { scheduleHeartbeat(); }
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
      runtime.lastError = 'อัปเดตการเปิดอัตโนมัติของ Windows ไม่ได้ ' + errorMessage(error);
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

  function requestError(message, code, statusCode = 400) {
    return Object.assign(new Error(message), { code, statusCode });
  }

  function readJson(request) {
    return new Promise((resolveBody, rejectBody) => {
      const chunks = [];
      let bytes = 0;
      let finished = false;
      const timer = setTimeout(() => fail(requestError('Request body read timed out.', 'BODY_TIMEOUT', 408)), 5_000);
      function cleanup() {
        clearTimeout(timer);
        request.off('data', onData);
        request.off('end', onEnd);
        request.off('aborted', onAborted);
        request.off('error', onError);
      }
      function fail(error) {
        if (finished) return;
        finished = true;
        cleanup();
        // Drain rather than destroy so the handler can deliver the typed response.
        request.resume();
        rejectBody(error);
      }
      function onData(chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > 1_048_576) return fail(requestError('Request body is too large.', 'BODY_TOO_LARGE', 413));
        chunks.push(buffer);
      }
      function onAborted() { fail(requestError('Request body was aborted.', 'BODY_ABORTED')); }
      function onError() { fail(requestError('Request body could not be read.', 'BODY_READ_FAILED')); }
      function onEnd() {
        if (finished) return;
        let text;
        try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks, bytes)); }
        catch { return fail(requestError('Request body must be valid UTF-8.', 'INVALID_UTF8')); }
        let body;
        try { body = JSON.parse(text); }
        catch { return fail(requestError('Request body must be valid JSON.', 'INVALID_JSON')); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(requestError('Request body must be a JSON object.', 'INVALID_BODY'));
        finished = true;
        cleanup();
        resolveBody(body);
      }
      request.on('data', onData);
      request.on('end', onEnd);
      request.on('aborted', onAborted);
      request.on('error', onError);
    });
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
    const saved = await commitConfig(current => {
      const sceneIds = new Set((Array.isArray(body.scenes) ? body.scenes : []).map(scene => scene.id));
      return { ...current, scenes: body.scenes, slots: Object.hasOwn(body, 'slots') ? body.slots : current.slots,
        manualOverride: current.manualOverride && sceneIds.has(current.manualOverride.sceneId) ? current.manualOverride : null };
    }, { writeSlots: Object.hasOwn(body, 'slots') });
    await reconcilePresence({ force: true, reason: 'Configuration saved' });
    return saved;
  }

  async function setScheduleEnabled(enabled) {
    await commitConfig(current => ({ ...current,
      settings: { ...current.settings, scheduleEnabled: Boolean(enabled) },
      manualOverride: enabled ? current.manualOverride : null }));
    if (enabled) await reconcilePresence({ force: true, reason: 'Daily schedule resumed' });
    else stopSchedulerTimer();
  }

  async function setManualOverride(sceneId) {
    await commitConfig(current => {
      if (!clientId) throw new Error('Add your Discord Application ID in API keys before showing a Scene on Discord.');
      if (!current.scenes.some(scene => scene.id === sceneId)) throw new Error('Choose an existing Scene.');
      const schedule = getScheduleState(current.slots, nowDate());
      if (current.settings.selectionMode === 'schedule' && !schedule.nextAt) throw new Error('Add at least one enabled Daily Time Slot before using an override.');
      return { ...current, settings: { ...current.settings, scheduleEnabled: true }, manualOverride: {
        sceneId, expiresAt: current.settings.selectionMode === 'apps' ? new Date(nowDate().getTime() + 3600000).toISOString() : schedule.nextAt.toISOString() } };
    });
    return reconcilePresence({ force: true, reason: 'Manual Override started' });
  }

  async function cancelManualOverride() {
    await commitConfig(current => ({ ...current, manualOverride: null }));
    return reconcilePresence({ force: true, reason: 'Manual Override cancelled' });
  }

  async function setAutostartEnabled(enabled) {
    if (!autostart.supported) throw new Error('Windows automatic startup is unavailable in this environment.');
    if (!clientId) throw new Error('Add your Discord Application ID before enabling Start with Windows.');
    await commitConfig(current => ({ ...current, settings: { ...current.settings, autostartEnabled: Boolean(enabled) } }));
    await syncAutostart();
  }

  async function pauseAndClear() {
    await commitConfig(current => ({ ...current, settings: { ...current.settings, scheduleEnabled: false }, manualOverride: null }));
    stopSchedulerTimer();
    runtime.desiredSceneId = null;
    runtime.desiredKey = null;
    await clearDiscordPresence();
  }

  async function applySavedSecrets(saved, { reconnectDiscord = false } = {}) {
    const previousClientId = clientId;
    appSecrets = await loadAppSecrets({
      filePath: appSecretsPath,
      environmentApiKey: env.GIPHY_API_KEY,
      environmentGiphyApiKey: env.GIPHY_API_KEY,
      environmentDiscordClientId: argumentClientId || env.DISCORD_CLIENT_ID || '',
    });

    // Prefer freshly saved values when environment is not overriding them.
    if (!env.GIPHY_API_KEY) {
      appSecrets.giphyApiKey = saved.giphyApiKey;
      appSecrets.giphySource = saved.giphySource;
      appSecrets.source = saved.giphySource;
    }
    if (!argumentClientId && !env.DISCORD_CLIENT_ID) {
      appSecrets.discordClientId = saved.discordClientId;
      appSecrets.discordSource = saved.discordSource;
    }

    if (env.PRESENCE_DISABLE_DEFAULT_APPLICATION !== '1') appSecrets = withDefaultApplication(appSecrets);
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
        runtime.lastError = 'ใส่ Discord Application ID ที่ API keys เพื่อเชื่อมต่อ';
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

  function stop(exitCode = 0, { exit = exitProcess } = {}) {
    if (stopPromise) return stopPromise;
    isStopping = true;
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    installedAppsAbort.abort();
    clearSchedulerTimeout(foregroundTimer);
    try { stopAppWatcher(); } catch { /* continue shutdown */ }
    stopSchedulerTimer();
    stopReconnectTimer();
    const candidate = discordClient;
    discordClient = undefined;
    runtime.discordUser = null;
    const shutdown = (async () => {
      if (server?.listening) {
        try { server.closeAllConnections(); } catch { /* older node */ }
        await new Promise(resolve => server.close(resolve));
      }
      // Do not queue behind a pending login/request. Teardown must stay bounded.
      if (candidate && runtime.active) await candidate.clearActivity().catch(() => undefined);
      await destroyDiscordClient(candidate);
    })();
    stopPromise = new Promise(resolveStop => {
      const deadline = setTimeout(() => {
        try { candidate?.transport?.socket?.destroy(); } catch { /* best effort */ }
        void Promise.resolve().then(() => candidate?.transport?.close?.()).catch(() => undefined);
        resolveStop();
      }, 3_000);
      shutdown.catch(() => undefined).then(() => { clearTimeout(deadline); resolveStop(); });
    }).then(() => {
      console.log('\nPresence Studio stopped.');
      if (exit) process.exit(exitCode);
    });
    return stopPromise;
  }

  const onSignal = () => void stop();
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  server = createServer(async (request, response) => {
    try {
      let url;
      try {
        const host = request.headers.host || '127.0.0.1';
        const authority = new URL('http://' + host);
        if (authority.host !== host || authority.pathname !== '/' || authority.search || authority.hash || authority.username || authority.password) throw new Error('Invalid authority');
        url = new URL(request.url || '/', authority);
      } catch { throw requestError('Request URL or Host is invalid.', 'INVALID_URL'); }
      const art = Object.values(characterArt).find(item => item.path === url.pathname);
      if (request.method === 'GET' && art) {
        const bytes = await readFile(join(scriptDirectory, '../public', art.path));
        response.writeHead(200, { 'Content-Type': art.type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
        response.end(bytes);
        return;
      }
      // Bundled Studio mock assets (app icons, avatar mocks). Flat directory,
      // extension allowlist, no traversal — Studio UI only, never sent to Discord.
      const mockArtDirs = { '/art/apps/': 'art/apps', '/art/scenes/': 'art/scenes' };
      const mockArtTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif' };
      for (const [prefix, dir] of Object.entries(mockArtDirs)) {
        if (request.method === 'GET' && url.pathname.startsWith(prefix)) {
          const name = url.pathname.slice(prefix.length);
          const dot = name.lastIndexOf('.');
          const type = dot > 0 ? mockArtTypes[name.slice(dot).toLowerCase()] : undefined;
          const safe = name && !name.includes('/') && !name.includes('\\') && !name.includes('..') && type;
          if (!safe) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('not found');
            return;
          }
          try {
            const bytes = await readFile(join(scriptDirectory, '../public', dir, name));
            response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
            response.end(bytes);
          } catch {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('not found');
          }
          return;
        }
      }
      if (request.method === 'GET' && url.pathname === '/studio-ci.css') {
        response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
        response.end(await readFile(join(scriptDirectory, 'studio-ci.css')));
        return;
      }
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

      if (request.method === 'PUT' && url.pathname === '/api/codex-session') {
        const body = await readJson(request);
        await commitConfig(current => ({ ...current, codexSession:body.title ? { title:body.title, startedAt:body.restart || !current.codexSession ? nowDate().toISOString() : current.codexSession.startedAt } : null }));
        await reconcilePresence({force:true,reason:'Codex session shared'});
        sendJson(response,200,{session:config.codexSession,runtime:runtimeSnapshot()});return;
      }
      if (request.method === 'GET' && url.pathname === '/api/apps') {
        sendJson(response, 200, { ...appSnapshot, foreground:stableForeground, mappings:config.appMappings, selectionMode:config.settings.selectionMode });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/installed-apps') {
        if (url.searchParams.get('refresh') === '1') {
          try { if (!options.disableHostEffects) await refreshInstalledApps(dataDirectory, installedAppsOptions); }
          catch { /* serve whatever is cached */ }
        }
        sendJson(response, 200, { apps:getInstalledApps() });
        return;
      }
      if (request.method === 'PUT' && url.pathname === '/api/app-mappings') {
        const body = await readJson(request);
        if (!['apps', 'schedule'].includes(body.selectionMode)) throw new Error('Choose applications or schedule.');
        await commitConfig(current => ({ ...current, appMappings:body.mappings, settings:{ ...current.settings, selectionMode:body.selectionMode, scheduleEnabled:true }, manualOverride:null }));
        await reconcilePresence({ force:true, reason:'Application mappings saved' });
        sendJson(response, 200, { config:publicConfig(), runtime:runtimeSnapshot() });
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
        setTimeout(() => {
          Promise.resolve().then(() => options.onQuit ? options.onQuit() : stop()).catch(error => { runtime.lastError = errorMessage(error); });
        }, 50);
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
      if (options.requireOwnership) {
        void stop(0, { exit: false }).then(() => failServerStart(Object.assign(new Error('Presence Studio port is already in use.'), { code: 'STUDIO_PORT_IN_USE' })));
        return;
      }
      const studioUrl = 'http://127.0.0.1:' + port;
      onLog('Presence Studio is already running at ' + studioUrl);
      if (shouldOpenBrowser) openBrowser(studioUrl);
      if (exitProcess) process.exit(0);
      else if (finishServerStart) finishServerStart({ alreadyRunning: true, url: studioUrl, port, stop: () => Promise.resolve() });
      return;
    }
    console.error('Presence Studio server failed: ' + errorMessage(error));
    if (exitProcess) process.exit(1);
    else if (failServerStart) failServerStart(new Error('Presence Studio server failed: ' + errorMessage(error)));
  });

  let finishServerStart;
  let failServerStart;
  const started = await new Promise((resolveStart, rejectStart) => {
    finishServerStart = resolveStart;
    failServerStart = rejectStart;
    server.listen(port, '127.0.0.1', async () => {
    if (!options.disableHostEffects) stopAppWatcher = (options.watchApps ?? watchWindowsApps)(snapshot => {
      const previousKey = desiredPresence().key;
      appSnapshot = snapshot;
      const path = snapshot.foregroundExecutable ?? snapshot.apps.find(app => app.foreground)?.executable ?? '';
      const reconcileTransition = before => {
        if (config.settings.selectionMode === 'apps' && desiredPresence().key !== before) void reconcilePresence({ reason:'Application selection changed' }).catch(error => { runtime.lastError = errorMessage(error); });
      };
      // Change-only output needs an explicit second stable observation.
      // Duplicate/catalog updates must not restart this timer.
      if (foregroundCandidate !== path) {
        foregroundCandidate = path;
        clearSchedulerTimeout(foregroundTimer);
        foregroundTimer = setSchedulerTimeout(() => {
          foregroundTimer = undefined;
          const before = desiredPresence().key;
          stableForeground = appKey(path);
          if (stableForeground && stableForeground !== recentApplications[0]) recentApplications = [stableForeground, ...recentApplications.filter(item => item !== stableForeground)].slice(0,100);
          reconcileTransition(before);
        }, 200);
      }
      reconcileTransition(previousKey);
    }, { disabled:env.PRESENCE_APP_DETECTION_DISABLE === '1' });
    // Installed-apps catalog (Start Menu): scanned in the background, served
    // from cache instantly.
    if (!options.disableHostEffects && env.PRESENCE_APP_DETECTION_DISABLE !== '1') void initInstalledApps(dataDirectory, installedAppsOptions).catch(error => { runtime.lastError = errorMessage(error); });
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
    await reconcilePresence({ reason: 'Startup' });
    void connectDiscord();
    if (shouldOpenBrowser) openBrowser(studioUrl);
    resolveStart({ alreadyRunning: false, url: studioUrl, port, stop: () => stop(0) });
    });
  });
  return started;

}

// Direct CLI entry: `node scripts/studio-server.mjs [--port=17345] [--no-open] [clientId]`
const invokedAsScript = (() => {
  try {
    return !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (invokedAsScript) {
  startStudioServer({ argv: process.argv.slice(2) }).catch((error) => {
    console.error(String(error?.message || error));
    process.exit(1);
  });
}
