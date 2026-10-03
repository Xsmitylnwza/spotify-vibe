import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { appIconManifest, matchAppIcon, appIconPackUrl, packedAppIcon, checkAppIconPackUrls } from '../app-icon-pack.mjs';
import { applicationBadge } from '../application-badges.mjs';

test('pack index contains unique, licensed 256px PNGs and unambiguous executable aliases', async () => {
  assert.ok(appIconManifest.length >= 50);
  assert.equal(new Set(appIconManifest.map(a => a.slug)).size, appIconManifest.length);
  for (const entry of appIconManifest) {
    assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(entry.names.length && entry.exeNames.length && entry.publisherHints.length);
    assert.ok(entry.source.type && entry.license.id && entry.license.text);
    const bytes = await readFile(new URL(`../../public/art/apps/${entry.slug}.png`, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
    assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
    assert.equal(bytes.readUInt32BE(16), 256); assert.equal(bytes.readUInt32BE(20), 256);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    for (const exeName of entry.exeNames) assert.equal(matchAppIcon({ exeName }), entry.slug, exeName);
  }
});

test('matcher handles executable paths, product/display aliases, case, spacing, versions and localized labels', () => {
  for (const [identity, slug] of [
    [{ executable: 'C:\\Microsoft VS Code\\CODE.EXE', name: 'Editor' }, 'visual-studio-code'],
    [{ displayName: ' vS   Code ', publisher: 'Microsoft Corporation' }, 'visual-studio-code'],
    [{ productName: 'Visual Studio Code', name: '编辑器' }, 'visual-studio-code'],
    [{ exe: 'C:/Apps/Code - Insiders.exe' }, 'visual-studio-code'],
    [{ exeName: 'chrome.exe', displayName: '谷歌浏览器' }, 'google-chrome'],
    [{ displayName: '谷歌浏览器' }, 'google-chrome'],
    [{ exe: 'C:\\Discord\\app-1.2.3\\Discord.exe' }, 'discord'],
    [{ exeName: 'DiscordCanary.exe' }, 'discord'],
    [{ exeName: 'Teams.exe' }, 'microsoft-teams'],
    [{ exeName: 'ms-teams.exe', name: 'Microsoft Teams (work or school)' }, 'microsoft-teams'],
    [{ displayName: 'Microsoft Teams (free)' }, 'microsoft-teams'],
    [{ name: 'ไมโครซอฟท์ ทีมส์' }, 'microsoft-teams'],
    [{ name: 'ไลน์' }, 'line'],
    [{ name: 'Adobe Photoshop 2025' }, 'adobe-photoshop'],
    [{ name: 'Visual Studio 2022' }, 'visual-studio'],
    [{ name: 'Notepad++ (64-bit)' }, 'notepad-plus-plus'],
    [{ exeName: 'RiotClientServices.exe', name: 'League of Legends' }, 'riot-client'],
    [{ exeName: 'devenv.exe', productName: 'Visual Studio Code' }, 'visual-studio'],
  ]) assert.equal(matchAppIcon(identity), slug, JSON.stringify(identity));
});

test('updaters, uninstallers, helpers and unknown brands do not borrow pack icons', () => {
  for (const identity of [
    { exe: 'C:\\Discord\\Update.exe', name: 'Discord' },
    { exeName: 'Discord Update.exe', name: 'Discord' },
    { exeName: 'DiscordUpdate.exe', name: 'Discord' },
    { exeName: 'Squirrel.exe', displayName: 'Slack' },
    { exeName: 'unins000.exe', name: 'Visual Studio Code' },
    { exeName: 'DiscordUninstall.exe', name: 'Discord' },
    { exeName: 'Discord.exe', name: 'Uninstall Discord' },
    { exeName: 'chrome.exe', name: 'ถอนการติดตั้ง Google Chrome' },
    { exeName: 'chrome.exe', name: '卸载 Chrome' },
    { exeName: 'RobloxStudioInstaller.exe', name: 'Roblox' },
    { exeName: 'DiscordHelper.exe' }, { name: 'Notepad' },
    { name: 'Chrome Password Exporter' }, { publisher: 'Microsoft' }, {},
  ]) assert.equal(matchAppIcon(identity), null, JSON.stringify(identity));
});

test('public URLs use the owned repo and configurable ref; badges use the same matcher', () => {
  const url = appIconPackUrl('discord', { ref: 'abc123' });
  assert.equal(url, 'https://raw.githubusercontent.com/Xsmitylnwza/spotify-vibe/abc123/public/art/apps/discord.png');
  assert.match(appIconPackUrl('discord', { ref: 'improve/flow-ux' }), /\/improve\/flow-ux\/public\/art\/apps\/discord.png$/);
  assert.equal(applicationBadge('C:/Apps/Discord.exe', 'Discord', { ref: 'abc123' }), url);
  assert.equal(packedAppIcon({ name: 'Unknown' }), '');
  assert.equal(applicationBadge('C:/Discord/Update.exe', 'Discord'), null);
  assert.equal(appIconPackUrl('../secret', { ref: 'main' }), '');
  for (const ref of ['../main', 'main?token=x', 'main#hash', '']) assert.throws(() => appIconPackUrl('discord', { ref }), /Invalid/);
});

test('URL check reports 200 PNG, missing ref/file, non-image responses and network failures', async () => {
  const entries = appIconManifest.slice(0, 4), statuses = [200, 404, 200];
  let calls = 0;
  const results = await checkAppIconPackUrls({ ref: 'test-commit', entries, fetchImpl: async url => {
    assert.match(url, /\/test-commit\/public\/art\/apps\//);
    const index = calls++;
    if (index === 3) throw new Error('offline');
    return new Response('x', { status: statuses[index], headers: { 'Content-Type': index === 2 ? 'text/html' : 'image/png' } });
  } });
  assert.equal(calls, 4); assert.deepEqual(results.map(r => r.ok), [true, false, false, false]);
  assert.equal(results[1].status, 404); assert.equal(results[3].error, 'offline');
});
