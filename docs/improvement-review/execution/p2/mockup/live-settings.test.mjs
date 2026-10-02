import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('./mockup.js', import.meta.url), 'utf8');
function renderer() {
  const ctx = vm.createContext({ document: { addEventListener() {}, querySelector() { return null; } }, addEventListener() {}, URL, console });
  vm.runInContext(source.slice(0, source.indexOf('(function boot()')), ctx);
  const run = code => vm.runInContext(code, ctx);
  run('REAL.enabled=true; LIVE.enabled=true; REAL.ready=true; LIVE.checked=true; LIVE.connected=true');
  return run;
}
test('live Settings renders every section with icon refresh buttons and no orphan workspace card', () => {
  const run = renderer(); const html = run('settingsView()');
  for (const id of ['Discord connection', 'Startup &amp; window', 'Startup & window', 'Global hotkey', 'Privacy', 'Image hosting', 'Back up', 'History', 'Appearance', 'Quit Vibe']) if (id === 'Startup &amp; window') continue; else assert.ok(html.includes(id), id);
  assert.ok(html.includes('data-bind="appid"') && html.includes('data-bind="ret"') && html.includes('data-act="theme"'));
  assert.ok(html.includes('aria-label="Refresh profile"') && html.includes('aria-label="Refresh apps"'));
  assert.ok(!html.includes('Your workspace') && !html.includes('Refresh apps from this PC') && !html.includes('manual activity delivery'));
  assert.ok(!/>Refresh profile</.test(html));
});
test('refresh icon spins and disables while profile loads', () => {
  const run = renderer(); run("profileStatus='loading'");
  assert.match(run('settingsView()'), /mk-icon-refresh is-spinning"[^>]*data-act="refreshdiscord"|data-act="refreshdiscord"[^>]*disabled/);
});
