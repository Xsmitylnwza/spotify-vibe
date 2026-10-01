const LOCAL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function parseLocalTime(value) {
  const time = String(value ?? '').trim();
  if (!LOCAL_TIME_PATTERN.test(time)) {
    throw new Error('Daily Time Slot must use 24-hour HH:MM format.');
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function enabledSlots(slots) {
  return (Array.isArray(slots) ? slots : [])
    .filter((slot) => slot?.enabled !== false)
    .map((slot) => ({ ...slot, minuteOfDay: parseLocalTime(slot.startTime) }))
    .sort((left, right) => left.minuteOfDay - right.minuteOfDay);
}

function localBoundary(now, minuteOfDay) {
  const boundary = new Date(now);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  boundary.setHours(hours, minutes, 0, 0);
  return boundary;
}

export function getScheduleState(slots, now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('Scheduler requires a valid Date.');
  }

  const ordered = enabledSlots(slots);
  if (ordered.length === 0) {
    return {
      activeSlot: null,
      nextSlot: null,
      nextAt: null,
      millisecondsUntilNext: null,
    };
  }

  const currentMinute = now.getHours() * 60 + now.getMinutes();
  let activeIndex = -1;
  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index].minuteOfDay <= currentMinute) activeIndex = index;
  }
  if (activeIndex < 0) activeIndex = ordered.length - 1;

  const nextIndex = (activeIndex + 1) % ordered.length;
  const activeSlot = ordered[activeIndex];
  const nextSlot = ordered[nextIndex];
  const nextAt = localBoundary(now, nextSlot.minuteOfDay);
  if (nextAt.getTime() <= now.getTime()) nextAt.setDate(nextAt.getDate() + 1);

  return {
    activeSlot,
    nextSlot,
    nextAt,
    millisecondsUntilNext: Math.max(0, nextAt.getTime() - now.getTime()),
  };
}

export function nextHeartbeatDelay(scheduleState, maximumDelay = 60_000) {
  if (!scheduleState?.nextAt) return maximumDelay;
  return Math.max(250, Math.min(scheduleState.millisecondsUntilNext, maximumDelay));
}
