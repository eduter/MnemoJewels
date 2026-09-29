import time from './time';

export interface DynamicIntervalSchedule {
  startedAt: number;
  delay: number;
}

interface DynamicInterval {
  timeoutId: ReturnType<typeof setTimeout> | null;
  schedule: DynamicIntervalSchedule;
}

const intervals = new Map<number, DynamicInterval>();
let nextIntervalId = 1;

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function weighedRandom(options: Record<string, number>): string {
  let weightSum = 0;
  for (const option in options) {
    if (Object.prototype.hasOwnProperty.call(options, option)) {
      weightSum += options[option];
    }
  }
  const randomNumber = Math.random();
  let accumulatedWeight = 0;
  for (const option in options) {
    if (Object.prototype.hasOwnProperty.call(options, option)) {
      accumulatedWeight += options[option];
      if (randomNumber < accumulatedWeight / weightSum) {
        return option;
      }
    }
  }
  throw new Error('weighedRandom: no option selected');
}

function randomPop<T>(array: T[]): T {
  return array.splice(randomInt(array.length), 1)[0];
}

function setDynamicInterval(
  callback: () => void,
  getDelay: () => number,
  onSchedule?: (schedule: DynamicIntervalSchedule) => void,
  resume?: { delay: number; remaining: number },
): number {
  const internalIntervalId = nextIntervalId++;

  function iteration(): void {
    if (!intervals.has(internalIntervalId)) {
      return;
    }
    callback();
    scheduleNextIteration(freshSchedule());
  }

  function freshSchedule(): DynamicIntervalSchedule {
    return { startedAt: time.now(), delay: Math.max(0, getDelay()) };
  }

  // A resume carries the delay a window should span and the time still left in
  // it. Anchoring the start "remaining" ago in the past keeps the progress
  // mapping honest while the paused stretch stays excluded from the countdown;
  // only the first window is resumed, later ones use the live delay.
  function firstSchedule(): DynamicIntervalSchedule {
    if (!resume) {
      return freshSchedule();
    }
    const delay = Math.max(0, resume.delay);
    const remaining = Math.max(0, resume.remaining);
    return { startedAt: time.now() - (delay - remaining), delay };
  }

  function scheduleNextIteration(schedule: DynamicIntervalSchedule): void {
    if (!intervals.has(internalIntervalId)) {
      return;
    }
    const remaining = Math.max(0, schedule.startedAt + schedule.delay - time.now());
    const timeoutId = setTimeout(iteration, remaining);
    intervals.set(internalIntervalId, { timeoutId, schedule });
    onSchedule?.({ ...schedule });
  }

  const first = firstSchedule();
  intervals.set(internalIntervalId, { timeoutId: null, schedule: first });
  scheduleNextIteration(first);

  return internalIntervalId;
}

function clearDynamicInterval(intervalId: number): void {
  const interval = intervals.get(intervalId);
  if (interval) {
    if (interval.timeoutId !== null) {
      clearTimeout(interval.timeoutId);
    }
    intervals.delete(intervalId);
  }
}

function getDynamicIntervalSchedule(intervalId: number): DynamicIntervalSchedule | null {
  const interval = intervals.get(intervalId);
  return interval ? { ...interval.schedule } : null;
}

export function getSpawnProgress(startedAt: number, delay: number, now: number): number {
  if (delay <= 0) {
    return 1;
  }
  return Math.max(0, Math.min(1, (now - startedAt) / delay));
}

function copyData<T>(value: T): T {
  if (value === undefined) {
    return undefined as T;
  } else {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

export default {
  randomInt,
  weighedRandom,
  randomPop,
  setDynamicInterval,
  clearInterval: clearDynamicInterval,
  getDynamicIntervalSchedule,
  copyData,
};
