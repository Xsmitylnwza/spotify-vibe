export function validateCodexSession(value) {
  if (!value) return null;
  const title = String(value.title || '').trim();
  if (!title || title.length > 128) throw new Error('Session title must contain 1–128 characters.');
  const startedAt = new Date(value.startedAt);
  if (!Number.isFinite(startedAt.getTime()) || startedAt.getTime() > Date.now() + 60000) throw new Error('Invalid session start time.');
  return { title, startedAt:startedAt.toISOString() };
}

export function codexSessionScene(scene, mapping, session) {
  const isCodex = /\\OpenAI\.Codex_[^\\]+\\app\\ChatGPT\.exe$/i.test(mapping.executable.replaceAll('/', '\\'));
  if (!isCodex) return scene;
  return { ...scene, activityType:'playing', activityName:'Codex',
    details:session?.title || 'Working in Codex',
    state:session ? 'Working on this session' : 'Ready to build',
    detailsUrl:'', stateUrl:'', timerMode:'elapsed',
  };
}
