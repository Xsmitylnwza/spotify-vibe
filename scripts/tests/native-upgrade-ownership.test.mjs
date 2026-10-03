import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRetainableProof, executionIdentity, scopeOwnedProcesses } from '../../electron/native-upgrade-proof.mjs';

const root = { pid: 10, parentPid: 1, path: 'C:/ci/private/installer.exe', createdAt: '2026-10-03T01:00:00Z' };
const child = { pid: 20, parentPid: 10, path: 'C:/temp/nsis/old-uninstaller.exe', createdAt: '2026-10-03T01:00:01Z' };
const isRoot = (item) => item.path === root.path;
const scope = (rows, ledger = new Map()) => scopeOwnedProcesses(rows, ledger, isRoot);

test('full injected census admits differently named old-uninstaller and arbitrary descendants', () => {
  const other = { ...child, pid: 30, parentPid: 20, path: 'C:/temp/helper/custom-agent.bin', createdAt: '2026-10-03T01:00:02Z' };
  assert.deepEqual(scope([other, child, root]).map((item) => item.pid).sort(), [10, 20, 30]);
});
test('historical PID lookup reproduces faulty adoption; current parent identity rejects unrelated child', () => {
  const ledger = new Map([[root.pid, root]]);
  const reused = { ...root, path: 'C:/unrelated/service.exe', createdAt: '2026-10-03T02:00:00Z' };
  const unrelated = { ...child, path: 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', createdAt: '2026-10-03T02:00:01Z' };
  assert.ok(ledger.has(unrelated.parentPid), 'Old algorithm would incorrectly adopt this child');
  assert.deepEqual(scope([reused, unrelated], ledger), []);
});
test('same parent path with reused PID and new creation time cannot adopt a child', () => {
  const ledger = new Map([[child.pid, child]]);
  const reused = { ...child, createdAt: '2026-10-03T02:00:00Z' };
  const unrelated = { ...root, pid: 30, parentPid: 20, path: 'C:/unrelated/helper.exe', createdAt: '2026-10-03T02:00:01Z' };
  assert.deepEqual(scope([reused, unrelated], ledger), []);
});
test('missing current parent cannot admit a previously unverified child', () => {
  assert.deepEqual(scope([child], new Map([[root.pid, root]])), []);
});
test('child created before current parent identity cannot be adopted', () => {
  assert.deepEqual(scope([root, { ...child, createdAt: '2026-10-03T00:59:59Z' }]).map((item) => item.pid), [10]);
});
test('verified orphan remains owned after parent exit and after parent PID reuse', () => {
  const ledger = new Map(); scope([root, child], ledger);
  assert.deepEqual(scope([child], ledger), [child]);
  assert.deepEqual(scope([{ ...root, path: 'C:/unrelated/service.exe', createdAt: '2026-10-03T02:00:00Z' }, child], ledger), [child]);
});
test('cleanup cannot report empty while differently named owned child lives', () => {
  const ledger = new Map(); scope([root, child], ledger);
  const oldFilteredCensus = [child].filter((item) => {
    const name = item.path.split('/').at(-1);
    return ['Vibe Studio.exe', 'installer.exe', 'elevate.exe', 'powershell.exe'].includes(name)
      || name.startsWith('Vibe-Studio-Setup-') || name.endsWith('.tmp');
  });
  assert.equal(oldFilteredCensus.length, 0, 'Old name-filtered census would falsely report clean cleanup');
  assert.equal(scope([child], ledger).length === 0, false);
  assert.equal(scope([], ledger).length === 0, true);
});
test('null or inaccessible unrelated fields are ignored without leaking command lines', () => {
  assert.deepEqual(scope([null, { pid: 1, path: null, createdAt: null, commandLine: 'private owner data' }, root]), [root]);
});
test('inaccessible previously owned identity fails closed instead of proving clean exit', () => {
  const ledger = new Map(); scope([root, child], ledger);
  assert.throws(() => scope([{ ...child, path: null }], ledger), /Cannot revalidate owned/);
});
test('inaccessible newly observed child of current owned parent fails closed', () => {
  assert.throws(() => scope([root, { ...child, path: null, createdAt: null }]), /Cannot validate child/);
});
test('deep reversed census reaches a fixed point beyond three generations', () => {
  const rows = [root];
  for (let index = 1; index <= 8; index++) rows.push({ ...child, pid: 10 + index, parentPid: 9 + index, createdAt: `2026-10-03T01:00:0${index}Z` });
  assert.equal(scope(rows.reverse()).length, 9);
});
test('reused child PID with changed path cannot inherit verified orphan ownership', () => {
  const ledger = new Map(); scope([root, child], ledger);
  assert.deepEqual(scope([{ ...child, path: 'C:/unrelated/new.exe' }], ledger), []);
});
test('successful proof requires exact executed checkout, harness and workflow attribution', () => {
  const execution = executionIdentity();
  const proof = { status: 'passed', nativeUpgradeProven: true, repository: 'Xsmitylnwza/spotify-vibe', workflowRunId: '42', workflowRunAttempt: '1', finishedAt: '2026-10-03T03:00:00Z', candidate: { automaticProcess: child }, execution };
  assert.equal(assertRetainableProof(proof, '42', '1', execution), true);
  assert.throws(() => assertRetainableProof({ ...proof, execution: undefined }, '42', '1', execution));
  for (const key of Object.keys(execution)) {
    assert.throws(() => assertRetainableProof({ ...proof, execution: { ...execution, [key]: '0'.repeat(execution[key].length) } }, '42', '1', execution));
  }
  assert.throws(() => assertRetainableProof({ ...proof, cleanupError: 'owned child remains alive' }, '42', '1', execution));
});
