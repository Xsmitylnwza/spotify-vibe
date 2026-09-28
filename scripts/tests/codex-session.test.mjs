import test from 'node:test';
import assert from 'node:assert/strict';
import { codexSessionScene, validateCodexSession } from '../codex-session.mjs';
import { createDefaultConfig,createDiscordActivity,validateConfig } from '../presence-config.mjs';
test('shared Codex session replaces music fields and preserves its elapsed start',()=>{
  const session=validateCodexSession({title:'Build the Studio',startedAt:'2026-09-01T00:00:00Z'});
  const scene=codexSessionScene(createDefaultConfig().scenes[0],{executable:'C:\\WindowsApps\\OpenAI.Codex_1\\app\\ChatGPT.exe'},session);
  const activity=createDiscordActivity(scene,new Date(session.startedAt),{artBaseUrl:'https://example.com/'});
  assert.equal(activity.type,0);assert.equal(activity.name,'Codex');assert.equal(activity.details,session.title);assert.equal(activity.timestamps.start,Date.parse(session.startedAt));
  assert.deepEqual(validateConfig({...createDefaultConfig(),codexSession:session}).codexSession,session);
});
test('other apps keep their preset; invalid session dates fail',()=>{
  const scene=createDefaultConfig().scenes[0];assert.equal(codexSessionScene(scene,{executable:'C:\\Discord.exe'},null),scene);
  assert.throws(()=>validateCodexSession({title:'Session',startedAt:'invalid'}));
});
