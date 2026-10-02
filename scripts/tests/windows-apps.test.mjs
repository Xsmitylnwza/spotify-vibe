import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { watchWindowsApps } from '../windows-apps.mjs';

function fixture() {
  let time = 0, id = 0;
  const timers = new Map(), children = [], snapshots = [];
  const stop = watchWindowsApps(snapshot => snapshots.push(snapshot), {
    platform:'win32', now:() => time,
    setTimer:(fn, ms) => { timers.set(++id, { fn, at:time + ms }); return id; },
    clearTimer:id => timers.delete(id),
    spawnHelper:() => {
      const child = new EventEmitter();
      child.stdout = new PassThrough(); child.stderr = new PassThrough();
      child.kills = 0; child.kill = () => { child.kills++; };
      children.push(child); return child;
    },
  });
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const next = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    time = end;
  }
  const emit = value => children.at(-1).stdout.write(JSON.stringify(value) + '\n');
  return { children, snapshots, timers, emit, advance, stop };
}
const snapshot = { apps:[{ executable:'C:\\a.exe', foreground:true, name:'A', processId:1 }], running:['C:\\a.exe','C:\\b.exe'] };

test('detector delivers only semantic changes and suppresses transport time/order/heartbeats', () => {
  const f = fixture();
  f.emit(snapshot);
  f.emit({ ...snapshot, running:[...snapshot.running].reverse(), observedAt:'later' });
  f.emit({ heartbeat:true, observedAt:'now' });
  assert.equal(f.snapshots.length, 1);
  f.emit({ ...snapshot, running:['C:\\a.exe'] });
  f.emit({ ...snapshot, foregroundExecutable:'C:\\b.exe' });
  assert.equal(f.snapshots.length, 3);
  f.stop(); assert.equal(f.timers.size, 0);
});

test('heartbeats keep helper alive, a stall fails closed once and restarts then recovers', () => {
  const f = fixture(); f.emit(snapshot);
  for (let i=0;i<4;i++) { f.advance(5_000); f.emit({ heartbeat:true, observedAt:'now' }); }
  assert.equal(f.children.length, 1); assert.equal(f.snapshots.length, 1);
  f.advance(15_000);
  assert.equal(f.snapshots.length, 2); assert.deepEqual(f.snapshots[1].running, []);
  assert.equal(f.children[0].kills, 1);
  f.advance(1_000); assert.equal(f.children.length, 2);
  f.emit(snapshot); assert.equal(f.snapshots.length, 3);
  f.stop(); f.advance(60_000); assert.equal(f.children.length, 2);
});

test('crash plus exit causes one failure/retry; old helper output cannot revive current state', () => {
  const f = fixture(); f.emit(snapshot);
  f.children[0].emit('error', new Error('crash')); f.children[0].emit('exit', 1);
  f.advance(1_000); f.children[0].stdout.write(JSON.stringify(snapshot) + '\n');
  assert.equal(f.children.length, 2); assert.equal(f.snapshots.length, 2);
  f.emit(snapshot); assert.equal(f.snapshots.length, 3); f.stop();
});

test('malformed output does not count as liveness and restarts; disabled host never spawns', () => {
  const f = fixture(); f.children[0].stdout.write('{}\n');
  assert.equal(f.snapshots.length, 1); assert.ok(f.snapshots[0].error);
  f.advance(1_000); assert.equal(f.children.length, 2); f.stop();
  let calls = 0;
  watchWindowsApps(() => {}, { disabled:true, spawnHelper:() => calls++ })();
  assert.equal(calls, 0);
});

test('foreground changes arrive independently while the bulk catalog remains unchanged', () => {
  const f = fixture(); f.emit(snapshot);
  // The helper's previous complete catalog remains valid during its async scan.
  f.advance(200); f.emit({ ...snapshot, foregroundExecutable:'C:\\b.exe' });
  assert.equal(f.snapshots.length,2);
  assert.equal(f.snapshots[1].foregroundExecutable,'C:\\b.exe');
  assert.deepEqual(f.snapshots[1].running,snapshot.running);
  f.advance(5_000); f.emit({heartbeat:true,observedAt:'scan in flight'});
  assert.equal(f.snapshots.length,2); assert.equal(f.children.length,1);
  f.stop();
});

test('bulk timeout error followed by helper exit restarts even after fresh heartbeats', () => {
  const f = fixture(); f.emit(snapshot);
  f.advance(5_000); f.emit({heartbeat:true,observedAt:'scan in flight'});
  f.advance(5_000); f.emit({apps:[],running:[],error:'Windows process scan timed out.'});
  f.children[0].emit('exit',1);
  assert.equal(f.snapshots.at(-1).running.length,0);
  f.advance(1_000); assert.equal(f.children.length,2);
  f.emit(snapshot); assert.equal(f.snapshots.at(-1).error,undefined);
  f.stop(); assert.equal(f.timers.size,0);
});

test('scan fault and failure exit cannot recover from old catalog; new helper must deliver a fresh scan', () => {
  const f = fixture();
  try {
    f.emit(snapshot);
    f.emit({apps:[],running:[],error:'Could not read visible Windows applications.'});
    const failedChild = f.children[0];
    failedChild.emit('exit', 1);
    const failedCount = f.snapshots.length;
    failedChild.stdout.write(JSON.stringify(snapshot) + '\n');
    f.advance(999);
    assert.equal(f.snapshots.length, failedCount);
    assert.ok(f.snapshots.at(-1).error);
    assert.deepEqual(f.snapshots.at(-1).running, []);
    f.advance(1);
    f.emit({heartbeat:true,observedAt:'retry pending'});
    assert.equal(f.snapshots.length, failedCount);
    f.emit({...snapshot,running:['C:\\b.exe'],apps:[],foregroundExecutable:''});
    assert.equal(f.snapshots.at(-1).error, undefined);
    assert.deepEqual(f.snapshots.at(-1).running, ['C:\\b.exe']);
  } finally { f.stop(); }
});
