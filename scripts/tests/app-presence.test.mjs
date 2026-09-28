import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMappings, selectAppPreset, selectRunningPreset, createForegroundSettler } from '../app-presence.mjs';
import { createDefaultConfig, validateConfig } from '../presence-config.mjs';

test('Codex updates retain mapping while other installations remain distinct', () => {
  const oldPath='C:/Program Files/WindowsApps/OpenAI.Codex_26.901.5003.0_x64__2p2nqsd0c76g0/app/ChatGPT.exe';
  const newPath=oldPath.replace('26.901.5003.0','26.901.6511.0');
  const mappings=[{executable:oldPath,enabled:true,sceneId:'code'}];
  assert.equal(selectRunningPreset(mappings,[newPath],[newPath]),mappings[0]);
  assert.equal(selectAppPreset(mappings,newPath),mappings[0]);
  assert.equal(selectRunningPreset(mappings,[newPath.replace('2p2nqsd0c76g0','otherpublisher')]),null);
  assert.equal(selectRunningPreset(mappings,['C:/Other/ChatGPT.exe']),null);
  assert.throws(()=>validateMappings([...mappings,{...mappings[0],executable:newPath}],new Set(['code'])),/only one/);
});

test('application selection uses foreground executable, not another running app or a similar name', () => {
  const mappings=validateMappings([{name:'Codex',executable:'C:\\Apps\\Codex.exe',sceneId:'code'}, {name:'Discord',executable:'C:\\Apps\\Discord.exe',sceneId:'chat'}],new Set(['code','chat']));
  assert.equal(selectAppPreset(mappings,'c:/apps/CODEX.exe').sceneId,'code');
  assert.equal(selectAppPreset(mappings,'C:\\Other\\Codex.exe'),null);
  assert.equal(selectAppPreset(mappings,null),null);
  mappings[0].enabled=false;
  assert.equal(selectAppPreset(mappings,'C:\\Apps\\Codex.exe'),null);
});

test('brief foreground changes do not switch presets; stable unmatched app clears selection', () => {
  const settle=createForegroundSettler();
  assert.equal(settle('C:/Codex.exe',0),null);
  assert.equal(settle('C:/Codex.exe',199),null);
  assert.equal(settle('C:/Codex.exe',200),'c:\\codex.exe');
  assert.equal(settle('C:/Discord.exe',400),'c:\\codex.exe');
  assert.equal(settle('C:/Codex.exe',500),'c:\\codex.exe');
  assert.equal(settle('',800),'c:\\codex.exe');
  assert.equal(settle('',999),'c:\\codex.exe');
  assert.equal(settle('',1000),'');
});

test('mapping persistence preserves legacy configs and rejects deletion of referenced preset', () => {
  const config=createDefaultConfig();
  assert.equal(config.settings.selectionMode,'apps');
  const legacy=validateConfig({...config,version:1,appMappings:undefined,settings:{scheduleEnabled:true}});
  assert.equal(legacy.settings.selectionMode,'schedule');
  assert.deepEqual(legacy.appMappings,[]);
  const mapped=validateConfig({...config,appMappings:[{executable:'C:\\Codex.exe',sceneId:config.scenes[0].id}]});
  assert.deepEqual(validateConfig(JSON.parse(JSON.stringify(mapped))).appMappings,mapped.appMappings);
  assert.throws(()=>validateConfig({...mapped,scenes:mapped.scenes.slice(1),slots:[]}),/missing preset/);
  assert.throws(()=>validateMappings([{executable:'Codex.exe',sceneId:'x'}],new Set(['x'])),/full Windows/);
  assert.throws(()=>validateMappings([{executable:'C:\\Codex.exe',sceneId:'x'},{executable:'c:/codex.exe',sceneId:'x'}],new Set(['x'])),/only one/);
});
