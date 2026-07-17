import { parseLocalTime } from './presence-scheduler.mjs';

export const activityTypes = {
  playing: 0,
  listening: 2,
  watching: 3,
  competing: 5,
};

const gifUrls = {
  morning: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
  afternoon: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif',
  evening: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
  sleep: 'https://media.giphy.com/media/y0NFayaBeiWEU/giphy.gif',
};

function text(value) {
  return String(value ?? '').trim();
}

function validateIdentifier(label, value) {
  const identifier = text(value);
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(identifier)) {
    throw new Error(label + ' must use 1–64 letters, numbers, underscores, or hyphens.');
  }
  return identifier;
}

function validateRequiredText(label, value, minimum = 2, maximum = 128) {
  if (value.length < minimum || value.length > maximum) {
    throw new Error(label + ' must contain ' + minimum + '–' + maximum + ' characters.');
  }
}

function validateOptionalText(label, value, minimum = 2, maximum = 128) {
  if (value && (value.length < minimum || value.length > maximum)) {
    throw new Error(label + ' must contain ' + minimum + '–' + maximum + ' characters when provided.');
  }
}

function validateHttpsUrl(label, value) {
  if (!value) return;
  if (value.length > 512) throw new Error(label + ' must not exceed 512 characters.');
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(label + ' must be a valid HTTPS URL.');
  }
  if (parsed.protocol !== 'https:') throw new Error(label + ' must use HTTPS.');
}

function validateImageReference(label, value) {
  if (!value) return;
  if (value.length > 512) throw new Error(label + ' must not exceed 512 characters.');
  if (value.includes('://')) validateHttpsUrl(label, value);
}

export function validateScene(input) {
  const activityType = text(input?.activityType).toLowerCase() || 'playing';
  const timerMode = text(input?.timerMode).toLowerCase() || 'none';
  const rawButtons = Array.isArray(input?.buttons) ? input.buttons : [];
  const timerMinutes = Number(input?.timerMinutes ?? 30);

  if (!(activityType in activityTypes)) {
    throw new Error('Activity type must be Playing, Listening, Watching, or Competing.');
  }
  if (!['none', 'elapsed', 'remaining'].includes(timerMode)) {
    throw new Error('Timer mode must be none, elapsed, or remaining.');
  }
  if (!Number.isFinite(timerMinutes) || timerMinutes < 1 || timerMinutes > 1440) {
    throw new Error('Timer duration must be between 1 and 1440 minutes.');
  }

  const scene = {
    id: validateIdentifier('Scene ID', input?.id),
    sceneName: text(input?.sceneName) || 'Untitled Scene',
    activityType,
    activityName: text(input?.activityName) || 'Vibe Presence',
    details: text(input?.details),
    detailsUrl: text(input?.detailsUrl),
    state: text(input?.state),
    stateUrl: text(input?.stateUrl),
    largeImage: text(input?.largeImage),
    largeImageText: text(input?.largeImageText),
    largeImageUrl: text(input?.largeImageUrl),
    smallImage: text(input?.smallImage),
    smallImageText: text(input?.smallImageText),
    smallImageUrl: text(input?.smallImageUrl),
    timerMode,
    timerMinutes,
    buttons: rawButtons
      .map((button) => ({ label: text(button?.label), url: text(button?.url) }))
      .filter((button) => button.label || button.url),
  };

  validateRequiredText('Scene name', scene.sceneName, 1, 40);
  validateRequiredText('Activity name', scene.activityName);
  validateRequiredText('Details', scene.details);
  validateRequiredText('State', scene.state);
  validateOptionalText('Large image hover text', scene.largeImageText);
  validateOptionalText('Small image hover text', scene.smallImageText);
  validateHttpsUrl('Details URL', scene.detailsUrl);
  validateHttpsUrl('State URL', scene.stateUrl);
  validateImageReference('Large image/GIF', scene.largeImage);
  validateImageReference('Small image/GIF', scene.smallImage);
  validateHttpsUrl('Large image click URL', scene.largeImageUrl);
  validateHttpsUrl('Small image click URL', scene.smallImageUrl);

  if (scene.buttons.length > 2) throw new Error('Discord supports up to two buttons.');
  for (const [index, button] of scene.buttons.entries()) {
    validateRequiredText('Button ' + (index + 1) + ' label', button.label, 1, 32);
    validateHttpsUrl('Button ' + (index + 1) + ' URL', button.url);
  }

  return scene;
}

function validateSlot(input, sceneIds) {
  const slot = {
    id: validateIdentifier('Daily Time Slot ID', input?.id),
    startTime: text(input?.startTime),
    sceneId: validateIdentifier('Daily Time Slot Scene ID', input?.sceneId),
    enabled: input?.enabled !== false,
  };
  parseLocalTime(slot.startTime);
  if (!sceneIds.has(slot.sceneId)) {
    throw new Error('Daily Time Slot ' + slot.startTime + ' references a missing Scene.');
  }
  return slot;
}

function validateManualOverride(input, sceneIds) {
  if (!input) return null;
  const sceneId = validateIdentifier('Manual Override Scene ID', input.sceneId);
  if (!sceneIds.has(sceneId)) throw new Error('Manual Override references a missing Scene.');
  const expiresAt = text(input.expiresAt);
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) {
    throw new Error('Manual Override must contain a valid expiration time.');
  }
  return { sceneId, expiresAt: new Date(expiresAt).toISOString() };
}

export function validateConfig(input) {
  const rawScenes = Array.isArray(input?.scenes) ? input.scenes : [];
  const rawSlots = Array.isArray(input?.slots) ? input.slots : [];
  if (rawScenes.length < 1 || rawScenes.length > 20) {
    throw new Error('Configuration requires 1–20 Scenes.');
  }
  if (rawSlots.length > 24) throw new Error('Configuration supports up to 24 Daily Time Slots.');

  const scenes = rawScenes.map(validateScene);
  const sceneIds = new Set();
  for (const scene of scenes) {
    if (sceneIds.has(scene.id)) throw new Error('Scene IDs must be unique.');
    sceneIds.add(scene.id);
  }

  const slots = rawSlots.map((slot) => validateSlot(slot, sceneIds));
  const slotIds = new Set();
  const startTimes = new Set();
  for (const slot of slots) {
    if (slotIds.has(slot.id)) throw new Error('Daily Time Slot IDs must be unique.');
    if (startTimes.has(slot.startTime)) throw new Error('Daily Time Slot start times must be unique.');
    slotIds.add(slot.id);
    startTimes.add(slot.startTime);
  }
  slots.sort((left, right) => parseLocalTime(left.startTime) - parseLocalTime(right.startTime));

  return {
    version: 1,
    scenes,
    slots,
    settings: {
      scheduleEnabled: input?.settings?.scheduleEnabled !== false,
      autostartEnabled: input?.settings?.autostartEnabled !== false,
    },
    manualOverride: validateManualOverride(input?.manualOverride, sceneIds),
  };
}

export function createDefaultConfig() {
  return validateConfig({
    version: 1,
    scenes: [
      {
        id: 'morning',
        sceneName: 'Good Morning',
        activityType: 'listening',
        activityName: 'Morning Vibe',
        details: 'Starting the day slowly',
        detailsUrl: '',
        state: 'Coffee · fresh air · good music',
        stateUrl: '',
        largeImage: gifUrls.morning,
        largeImageText: 'Morning mode',
        largeImageUrl: '',
        smallImage: 'https://cdn.discordapp.com/embed/avatars/0.png',
        smallImageText: 'Good morning',
        smallImageUrl: '',
        timerMode: 'elapsed',
        timerMinutes: 30,
        buttons: [],
      },
      {
        id: 'afternoon',
        sceneName: 'Afternoon Flow',
        activityType: 'playing',
        activityName: 'Daylight Mode',
        details: 'Making things happen',
        detailsUrl: '',
        state: 'Afternoon energy',
        stateUrl: '',
        largeImage: gifUrls.afternoon,
        largeImageText: 'Afternoon flow',
        largeImageUrl: '',
        smallImage: 'https://cdn.discordapp.com/embed/avatars/1.png',
        smallImageText: 'In the flow',
        smallImageUrl: '',
        timerMode: 'elapsed',
        timerMinutes: 30,
        buttons: [],
      },
      {
        id: 'evening',
        sceneName: 'Evening Vibe',
        activityType: 'watching',
        activityName: 'After Hours',
        details: 'Winding down',
        detailsUrl: '',
        state: 'Games · friends · side quests',
        stateUrl: '',
        largeImage: gifUrls.evening,
        largeImageText: 'Evening mode',
        largeImageUrl: '',
        smallImage: 'https://cdn.discordapp.com/embed/avatars/2.png',
        smallImageText: 'After hours',
        smallImageUrl: '',
        timerMode: 'none',
        timerMinutes: 30,
        buttons: [],
      },
      {
        id: 'sleep',
        sceneName: 'Night Signal',
        activityType: 'listening',
        activityName: 'Night Mode',
        details: 'Offline, probably dreaming',
        detailsUrl: '',
        state: 'Back tomorrow',
        stateUrl: '',
        largeImage: gifUrls.sleep,
        largeImageText: 'Night signal',
        largeImageUrl: '',
        smallImage: 'https://cdn.discordapp.com/embed/avatars/3.png',
        smallImageText: 'Sleeping',
        smallImageUrl: '',
        timerMode: 'none',
        timerMinutes: 30,
        buttons: [],
      },
    ],
    slots: [
      { id: 'slot-morning', startTime: '06:00', sceneId: 'morning', enabled: true },
      { id: 'slot-afternoon', startTime: '12:00', sceneId: 'afternoon', enabled: true },
      { id: 'slot-evening', startTime: '18:00', sceneId: 'evening', enabled: true },
      { id: 'slot-sleep', startTime: '23:00', sceneId: 'sleep', enabled: true },
    ],
    settings: {
      scheduleEnabled: true,
      autostartEnabled: true,
    },
    manualOverride: null,
  });
}

export function createDiscordActivity(scene, now = new Date()) {
  const validScene = validateScene(scene);
  let timestamps;
  if (validScene.timerMode === 'elapsed') {
    timestamps = { start: now.getTime() };
  } else if (validScene.timerMode === 'remaining') {
    timestamps = { end: now.getTime() + validScene.timerMinutes * 60_000 };
  }

  const hasAssets = validScene.largeImage || validScene.smallImage;
  const assets = hasAssets ? {
    large_image: validScene.largeImage || undefined,
    large_text: validScene.largeImage ? validScene.largeImageText || validScene.details : undefined,
    large_url: validScene.largeImage ? validScene.largeImageUrl || undefined : undefined,
    small_image: validScene.smallImage || undefined,
    small_text: validScene.smallImage ? validScene.smallImageText || validScene.state : undefined,
    small_url: validScene.smallImage ? validScene.smallImageUrl || undefined : undefined,
  } : undefined;

  return {
    type: activityTypes[validScene.activityType],
    name: validScene.activityName,
    details: validScene.details,
    details_url: validScene.detailsUrl || undefined,
    state: validScene.state,
    state_url: validScene.stateUrl || undefined,
    timestamps,
    assets,
    buttons: validScene.buttons.length ? validScene.buttons : undefined,
    instance: false,
  };
}
