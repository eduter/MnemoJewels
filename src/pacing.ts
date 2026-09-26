import {
  DEFAULT_GROUP_SIZE,
  EXPERT_MAX_INTERVAL,
  INITIAL_INTERVAL,
  LAST_LEVEL,
  MAX_INTERVAL,
  MIN_INTERVAL,
  NUM_ROWS,
} from './constants';

export interface PacingState {
  averageThinkingTimes: [number, number, number];
  graceFactor: number;
}

export function createPacingState(): PacingState {
  return {
    averageThinkingTimes: [
      INITIAL_INTERVAL / 6,
      INITIAL_INTERVAL / 3,
      INITIAL_INTERVAL / 2,
    ],
    graceFactor: 1,
  };
}

export function recordMatch(
  state: PacingState,
  remainingCards: number,
  thinkingTime: number,
): void {
  const bucket = clamp(0, remainingCards, state.averageThinkingTimes.length - 1);
  const previous = state.averageThinkingTimes[bucket];
  const boundedThinkingTime = clamp(MIN_INTERVAL / 4, thinkingTime, MAX_INTERVAL);
  const adaptationRate = boundedThinkingTime > previous ? 0.3 : 0.12;

  state.averageThinkingTimes[bucket] =
    previous * (1 - adaptationRate) + boundedThinkingTime * adaptationRate;
  state.graceFactor = Math.max(1, state.graceFactor * 0.9);
}

export function recordMismatch(state: PacingState, thinkingTime: number): void {
  const observedThinkingTime = clamp(MIN_INTERVAL / 3, thinkingTime, MAX_INTERVAL);
  state.averageThinkingTimes = state.averageThinkingTimes.map(value =>
    Math.max(value * 1.12, observedThinkingTime),
  ) as PacingState['averageThinkingTimes'];
  state.graceFactor = 1.35;
}

export function getSpawnDelay(state: PacingState, numCards: number, level: number): number {
  const averageThinkingTime = getAverageThinkingTime(state);
  const cardsToConsider = Math.max(DEFAULT_GROUP_SIZE, numCards);
  const pressure = 1 + 0.35 *
    Math.max(0, numCards - DEFAULT_GROUP_SIZE) /
    (NUM_ROWS - DEFAULT_GROUP_SIZE);
  const requestedDelay = averageThinkingTime * cardsToConsider * pressure * state.graceFactor;
  const difficulty = getDifficulty(level);
  const levelMaximum = MAX_INTERVAL -
    difficulty * (MAX_INTERVAL - EXPERT_MAX_INTERVAL);

  return Math.round(clamp(MIN_INTERVAL, requestedDelay, levelMaximum));
}

export function getAverageThinkingTime(state: PacingState): number {
  return state.averageThinkingTimes.reduce((sum, value) => sum + value, 0) /
    state.averageThinkingTimes.length;
}

export function getDifficulty(level: number): number {
  const boundedLevel = clamp(1, level, LAST_LEVEL);
  return Math.pow(boundedLevel - 1, 2) / Math.pow(LAST_LEVEL - 1, 2);
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
