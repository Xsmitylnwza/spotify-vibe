import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultConfig, createDiscordActivity, validateConfig, resolveSceneText } from '../presence-config.mjs';
import { withApplicationBadge } from '../application-badges.mjs';

const scene = () => ({ ...createDefaultConfig().scenes[0], sceneName:'Coding', activityName:' {app} ',
  largeImage:'https://example.com/art.png',
  details:' {app}: {scene} ', state:' {user} {unknown} ', largeImageText:'{scene} {user}',
  smallImageText:'{app}', buttons:[{label:'Open {app}',url:'https://example.com'}] });

test('pure resolver covers all text fields once, preserves tokens, URLs and owner templates', () => {
  const input = scene(), before = structuredClone(input);
  const resolved = resolveSceneText(input, {app:'Orca',user:'Golf'});
  assert.equal(resolved.activityName,'Orca'); assert.equal(resolved.details,'Orca: Coding');
  assert.equal(resolved.state,'Golf {unknown}'); assert.equal(resolved.largeImageText,'Coding Golf');
  assert.equal(resolved.smallImageText,'Orca'); assert.equal(resolved.buttons[0].label,'Open Orca');
  assert.equal(resolved.buttons[0].url,input.buttons[0].url); assert.deepEqual(input,before);
  assert.equal(resolveSceneText(input,{app:'{scene}'}).activityName,'{scene}');
});

test('manual selection falls back app to Scene, unknown user to empty, empty required fields to Scene', () => {
  const input = {...scene(),activityName:'{user}',details:' {user} ',state:'{user}',largeImageText:'{user}'};
  const resolved = resolveSceneText(input);
  for (const key of ['activityName','details','state']) assert.equal(resolved[key],'Coding');
  assert.equal(resolved.largeImageText,''); assert.equal(resolved.smallImageText,'Coding');
});

test('Discord checks resolved length, while configuration retains unresolved templates', () => {
  const input = scene(), config = createDefaultConfig(); config.scenes = [input]; config.slots = [];
  assert.equal(validateConfig(config).scenes[0].activityName,'{app}');
  assert.equal(createDiscordActivity(input,new Date(),{app:'Orca',user:'Golf'}).name,'Orca');
  assert.throws(()=>createDiscordActivity(input,new Date(),{app:'x'.repeat(129)}),/Activity name/);
  assert.throws(()=>createDiscordActivity({...input,activityName:'Valid',details:'Valid',smallImageText:''},new Date(),{app:'x'.repeat(33)}),/Button/);
  const compact = {...input,details:'{user}'.repeat(40),state:'{user}'};
  config.scenes = [compact];
  assert.equal(validateConfig(config).scenes[0].details,compact.details);
  assert.equal(createDiscordActivity(compact).details,'Coding');
});

test('automatic badge uses upload or pack, explicit artwork and templates stay unchanged', () => {
  const input = {...scene(),smallImage:'@app',largeImage:'https://example.com/art.png'};
  const mapping = {executable:'C:\\Apps\\Orca.exe',name:'Orca'};
  const badge = withApplicationBadge(input,mapping,{publicIcon:'https://files.catbox.moe/orca.png'});
  assert.equal(badge.smallImage,'https://files.catbox.moe/orca.png');
  assert.equal(badge.largeImage,input.largeImage); assert.equal(badge.smallImageText,'{app}');
  assert.equal(createDiscordActivity(badge,new Date(),{app:'Orca'}).assets.small_image,badge.smallImage);
  const explicit = {...input,smallImage:'https://example.com/custom.png'};
  assert.equal(withApplicationBadge(explicit,mapping,{publicIcon:'https://files.catbox.moe/orca.png'}),explicit);
  const source = {...explicit,smallImageSource:'app-icon'};
  const changed = withApplicationBadge(source,mapping,{publicIcon:'https://files.catbox.moe/orca.png'});
  assert.equal(createDiscordActivity(changed,new Date(),{app:'Orca'}).assets.small_image,changed.smallImage);
  assert.equal(createDiscordActivity(input).assets.small_image,undefined);
});
