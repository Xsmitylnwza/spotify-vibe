import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRunningPreset } from '../app-presence.mjs';
import { withApplicationBadge } from '../application-badges.mjs';

const mappings=[{executable:'C:\\Codex.exe',sceneId:'a',enabled:true},{executable:'C:\\Discord.exe',sceneId:'b',enabled:true}];
test('presence survives switching to an unmapped foreground app',()=>{
  assert.equal(selectRunningPreset(mappings,['C:/Codex.exe'],['C:/Chrome.exe','C:/Codex.exe']).sceneId,'a');
});
test('recent running mapped app wins, closing it falls back, closing all clears',()=>{
  assert.equal(selectRunningPreset(mappings,['C:/Codex.exe','C:/Discord.exe'],['C:/Discord.exe','C:/Codex.exe']).sceneId,'b');
  assert.equal(selectRunningPreset(mappings,['C:/Codex.exe'],['C:/Discord.exe','C:/Codex.exe']).sceneId,'a');
  assert.equal(selectRunningPreset(mappings,[],['C:/Discord.exe']),null);
  assert.equal(selectRunningPreset([{...mappings[0],enabled:false}],['C:/Codex.exe']),null);
});
test('app badge preserves character and does not mutate the shared preset',()=>{
  const scene={largeImage:'builtin:hinata-idle',smallImage:'custom'};
  const result=withApplicationBadge(scene,{executable:'C:\\Users\\me\\AppData\\Local\\Discord\\app-1.2\\Discord.exe',name:'Discord'});
  assert.equal(result.largeImage,scene.largeImage);assert.match(result.smallImage,/discord.png$/);assert.equal(result.smallImageText,'Discord');assert.equal(scene.smallImage,'custom');
  assert.equal(result.activityName,'Discord');
  assert.equal(withApplicationBadge(scene,{executable:'C:\\Other.exe',name:'Other App'}).activityName,'Other App');
  assert.equal(withApplicationBadge(scene,{executable:'C:\\Other.exe'}),scene);
});
