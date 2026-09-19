import time from './time';

const intervals: Record<number, ReturnType<typeof setTimeout>> = {};

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

function setDynamicInterval(callback: () => void, getDelay: () => number): number {
  const internalIntervalId = time.now();

  function iteration(): void {
    callback();
    scheduleNextIteration();
  }

  function scheduleNextIteration(): void {
    if (internalIntervalId in intervals) {
      intervals[internalIntervalId] = setTimeout(iteration, getDelay());
    }
  }

  intervals[internalIntervalId] = setTimeout(iteration, 0);
  scheduleNextIteration();

  return internalIntervalId;
}

function clearDynamicInterval(intervalId: number): void {
  if (intervalId in intervals) {
    clearTimeout(intervals[intervalId]);
    delete intervals[intervalId];
  }
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
  copyData,
};
