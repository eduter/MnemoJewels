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
): number {
  const internalIntervalId = nextIntervalId++;

  function iteration(): void {
    if (!intervals.has(internalIntervalId)) {
      return;
    }
    callback();
    scheduleNextIteration();
  }

  function scheduleNextIteration(): void {
    if (!intervals.has(internalIntervalId)) {
      return;
    }
    const schedule = {
      startedAt: time.now(),
      delay: Math.max(0, getDelay()),
    };
    const timeoutId = setTimeout(iteration, schedule.delay);
    intervals.set(internalIntervalId, { timeoutId, schedule });
    onSchedule?.({ ...schedule });
  }

  intervals.set(internalIntervalId, {
    timeoutId: null,
    schedule: { startedAt: time.now(), delay: 0 },
  });
  scheduleNextIteration();

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
