// Renderer contract: substitute once, after other templating, without changing
// the saved Scene. Unknown tokens and replacement text containing tokens stay literal.
export function sceneTextVariables(scene, { app, user } = {}) {
  const name = String(scene?.sceneName ?? '').trim();
  return { app: String(app || name).trim(), scene: name, user: String(user ?? '').trim() };
}

export function resolveSceneText(scene, context = {}) {
  const variables = sceneTextVariables(scene, context);
  const resolve = value => String(value ?? '').replace(/\{(app|scene|user)\}/g, (_, key) => variables[key]).trim();
  const result = { ...scene };
  for (const field of ['activityName', 'details', 'state', 'largeImageText', 'smallImageText']) {
    result[field] = resolve(scene[field]);
    if (['activityName', 'details', 'state'].includes(field) && !result[field]) result[field] = variables.scene;
  }
  result.buttons = (scene.buttons || []).map(button => ({ ...button, label: resolve(button.label) }));
  return result;
}
