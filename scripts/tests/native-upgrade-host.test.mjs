import assert from 'node:assert/strict';
import test from 'node:test';
import { ps, signature } from '../../electron/native-upgrade-proof.mjs';

const parentEnv = {
  SystemRoot: 'C:\\Windows',
  PSModulePath: 'C:\\Program Files\\PowerShell\\7\\Modules;C:\\Users\\runner\\PowerShell\\Modules',
  Path: 'C:\\Program Files\\PowerShell\\7',
  RUNNER_TEMP: 'D:\\a\\_temp',
};

test('signature verification pins Windows PowerShell and replaces inherited PS7 module paths', () => {
  const original = { ...parentEnv };
  let calls = 0;
  const result = signature('D:\\a\\_temp\\unsigned installer.exe', {
    parentEnv,
    execute(command, args, options) {
      calls++;
      assert.equal(command, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
      assert.deepEqual(args.slice(0, 3), ['-NoProfile', '-NonInteractive', '-Command']);
      assert.match(args[3], /\$ErrorActionPreference='Stop';/);
      assert.match(args[3], /Get-AuthenticodeSignature -LiteralPath \$env:VIBE_PROOF_FILE/);
      assert.equal(options.env.PSModulePath, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules');
      assert.doesNotMatch(options.env.PSModulePath, /PowerShell\\7|Users\\runner/i);
      assert.equal(options.env.VIBE_PROOF_FILE, 'D:\\a\\_temp\\unsigned installer.exe');
      assert.equal(options.env.RUNNER_TEMP, parentEnv.RUNNER_TEMP);
      assert.equal(options.windowsHide, true);
      assert.equal(options.timeout, 30_000);
      return ' {"status":"NotSigned","subject":null}\r\n';
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { status: 'NotSigned', subject: null });
  assert.deepEqual(parentEnv, original);
});

test('module path sanitization removes case variants and cannot be overridden by a caller', () => {
  ps('Get-CimInstance Win32_Process', { pSmOdUlEpAtH: 'C:\\untrusted', PSModulePath: 'C:\\PS7' }, {
    parentEnv: { systemroot: 'D:\\Windows', psMODULEpath: 'C:\\PS7' },
    execute(command, args, options) {
      assert.equal(command, 'D:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
      assert.deepEqual(Object.keys(options.env).filter((key) => key.toLowerCase() === 'psmodulepath'), ['PSModulePath']);
      assert.equal(options.env.PSModulePath, 'D:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules');
      assert.match(args[3], /Get-CimInstance Win32_Process/);
      return '';
    },
  });
});

test('signature failures propagate instead of fabricating unsigned acceptance', () => {
  const failure = new Error('CouldNotAutoloadMatchingModule');
  assert.throws(() => signature('installer.exe', { parentEnv, execute() { throw failure; } }), (error) => error === failure);
  assert.throws(() => signature('installer.exe', { parentEnv, execute() { return ''; } }), SyntaxError);
  assert.deepEqual(signature('installer.exe', { parentEnv, execute() { return '{"status":"HashMismatch","subject":null}'; } }), { status: 'HashMismatch', subject: null });
});

test('missing or relative Windows system roots fail before spawning a guessed host', () => {
  for (const systemRoot of [undefined, 'Windows']) {
    assert.throws(() => ps('Get-AuthenticodeSignature', {}, { parentEnv: { SystemRoot: systemRoot }, execute() { assert.fail('must not spawn'); } }), /absolute SystemRoot/);
  }
});

test('ProductVersion 1.0.8.0 normalizes to the release version; other fourth parts are kept', async () => {
  const { normalizeProductVersion } = await import('../../electron/native-upgrade-proof.mjs');
  assert.equal(normalizeProductVersion('1.0.8.0'), '1.0.8');
  assert.equal(normalizeProductVersion('1.0.9'), '1.0.9');
  assert.equal(normalizeProductVersion('1.0.8.1'), '1.0.8.1');
});
