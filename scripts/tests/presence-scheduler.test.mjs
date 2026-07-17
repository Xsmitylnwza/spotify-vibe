import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getScheduleState,
  nextHeartbeatDelay,
  parseLocalTime,
} from '../presence-scheduler.mjs';

const slots = [
  { id: 'morning', startTime: '06:00', sceneId: 'one', enabled: true },
  { id: 'afternoon', startTime: '12:00', sceneId: 'two', enabled: true },
  { id: 'evening', startTime: '18:00', sceneId: 'three', enabled: true },
  { id: 'night', startTime: '23:00', sceneId: 'four', enabled: true },
];

test('parseLocalTime accepts strict 24-hour time', () => {
  assert.equal(parseLocalTime('00:00'), 0);
  assert.equal(parseLocalTime('23:59'), 1439);
  assert.throws(() => parseLocalTime('6:00'), /HH:MM/);
  assert.throws(() => parseLocalTime('24:00'), /HH:MM/);
});

test('selects the active and next slots during the day', () => {
  const now = new Date(2026, 6, 16, 14, 30, 12);
  const state = getScheduleState(slots, now);
  assert.equal(state.activeSlot.id, 'afternoon');
  assert.equal(state.nextSlot.id, 'evening');
  assert.equal(state.nextAt.getHours(), 18);
  assert.equal(state.nextAt.getMinutes(), 0);
  assert.equal(state.nextAt.getDate(), now.getDate());
});

test('wraps to the previous day before the first slot', () => {
  const now = new Date(2026, 6, 16, 5, 30);
  const state = getScheduleState(slots, now);
  assert.equal(state.activeSlot.id, 'night');
  assert.equal(state.nextSlot.id, 'morning');
  assert.equal(state.nextAt.getDate(), now.getDate());
  assert.equal(state.nextAt.getHours(), 6);
});

test('wraps the next boundary to tomorrow after the last slot', () => {
  const now = new Date(2026, 6, 16, 23, 30);
  const state = getScheduleState(slots, now);
  assert.equal(state.activeSlot.id, 'night');
  assert.equal(state.nextSlot.id, 'morning');
  assert.equal(state.nextAt.getDate(), now.getDate() + 1);
  assert.equal(state.nextAt.getHours(), 6);
});

test('an exact boundary activates the new slot', () => {
  const now = new Date(2026, 6, 16, 12, 0, 0, 0);
  const state = getScheduleState(slots, now);
  assert.equal(state.activeSlot.id, 'afternoon');
  assert.equal(state.nextSlot.id, 'evening');
});

test('disabled slots are skipped', () => {
  const now = new Date(2026, 6, 16, 14, 0);
  const state = getScheduleState(
    slots.map((slot) => slot.id === 'afternoon' ? { ...slot, enabled: false } : slot),
    now,
  );
  assert.equal(state.activeSlot.id, 'morning');
  assert.equal(state.nextSlot.id, 'evening');
});

test('one slot remains active and schedules itself for the next day', () => {
  const now = new Date(2026, 6, 16, 8, 0);
  const state = getScheduleState([slots[0]], now);
  assert.equal(state.activeSlot.id, 'morning');
  assert.equal(state.nextSlot.id, 'morning');
  assert.equal(state.nextAt.getDate(), now.getDate() + 1);
});

test('no enabled slots produces a paused state', () => {
  const state = getScheduleState([], new Date(2026, 6, 16, 8, 0));
  assert.equal(state.activeSlot, null);
  assert.equal(state.nextAt, null);
  assert.equal(nextHeartbeatDelay(state), 60_000);
});

test('heartbeat is capped so Windows clock changes are detected', () => {
  const state = getScheduleState(slots, new Date(2026, 6, 16, 14, 0));
  assert.equal(nextHeartbeatDelay(state), 60_000);
});
