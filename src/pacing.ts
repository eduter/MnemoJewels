import {
  DEFAULT_GROUP_SIZE,
  EXPERT_MAX_INTERVAL,
  INITIAL_INTERVAL,
  LAST_LEVEL,
  MAX_INTERVAL,
  MIN_INTERVAL,
} from './constants';

// How quickly the per-pair speed estimate follows the player. Slower on a
// match keeps one unusually fast or slow decision from whipsawing the pace;
// a mismatch is followed by a panicked, slow decision, so it pulls the
// estimate down a little harder and buys the player some room.
const MATCH_ADAPTATION_RATE = 0.15;
const MISMATCH_ADAPTATION_RATE = 0.25;

// Target rows on the board immediately after a spawn, per level. The low-level
// target leaves half the board free; the level-10 target leaves two rows, so a
// couple of slow decisions can fill it. The deadbeat controller aims the next
// interval at this number.
const TARGET_ROWS_FIRST_LEVEL = 4;
const TARGET_ROWS_LAST_LEVEL = 8;

export interface PacingState {
  /** How long each pair in a group of `n` takes, in ms; index 0 is the last pair. */
  averageThinkingTimes: [number, number, number, number];
}

export function createPacingState(): PacingState {
  return {
    averageThinkingTimes: [0, 0, 0, 0],
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

  if (previous === 0) {
    // First observation in this bucket: adopt it rather than easing up from
    // an arbitrary seed, which would spend the first few matches being wrong.
    state.averageThinkingTimes[bucket] = boundedThinkingTime;
    return;
  }
  state.averageThinkingTimes[bucket] =
    previous * (1 - MATCH_ADAPTATION_RATE) + boundedThinkingTime * MATCH_ADAPTATION_RATE;
}

export function recordMismatch(state: PacingState, thinkingTime: number): void {
  const observedThinkingTime = clamp(MIN_INTERVAL / 3, thinkingTime, MAX_INTERVAL);
  state.averageThinkingTimes = state.averageThinkingTimes.map(value => {
    if (value === 0) {
      return observedThinkingTime;
    }
    return value * (1 - MISMATCH_ADAPTATION_RATE) + observedThinkingTime * MISMATCH_ADAPTATION_RATE;
  }) as PacingState['averageThinkingTimes'];
}

export function getSpawnDelay(state: PacingState, rowsAfterSpawn: number, level: number): number {
  const levelMaximum = getLevelMaximum(level);
  if (!hasObservations(state)) {
    // Before the first match there is no measured pace to project from; start
    // at the intended beginner interval rather than at the floor.
    return Math.round(clamp(MIN_INTERVAL, INITIAL_INTERVAL, levelMaximum));
  }
  const secondsPerPair = getAverageThinkingTime(state);
  const target = getTargetRows(level);
  // Aim for `target` rows *including* the next group, so the board oscillates
  // around the target rather than above it. If the player keeps clearing at
  // their measured pace, they clear (rows now + next group - target) pairs
  // before that group lands, so that is the interval which puts the board back
  // on target. A fuller board lengthens the interval, a roomier one shortens it.
  const requestedDelay =
    Math.max(0, rowsAfterSpawn + DEFAULT_GROUP_SIZE - target) * secondsPerPair;

  return Math.round(clamp(MIN_INTERVAL, requestedDelay, levelMaximum));
}

function hasObservations(state: PacingState): boolean {
  return state.averageThinkingTimes.some(value => value > 0);
}

/**
 * Average time per pair, in ms. Buckets that have not seen a match yet are
 * ignored; before any match at all this returns the initial seed.
 */
export function getAverageThinkingTime(state: PacingState): number {
  const observed = state.averageThinkingTimes.filter(value => value > 0);
  if (observed.length === 0) {
    return INITIAL_INTERVAL / 3;
  }
  return observed.reduce((sum, value) => sum + value, 0) / observed.length;
}

export function getTargetRows(level: number): number {
  const boundedLevel = clamp(1, level, LAST_LEVEL);
  return TARGET_ROWS_FIRST_LEVEL +
    (boundedLevel - 1) * (TARGET_ROWS_LAST_LEVEL - TARGET_ROWS_FIRST_LEVEL) / (LAST_LEVEL - 1);
}

/** Slowest interval allowed at a level; quadratic so only the top levels bite. */
export function getLevelMaximum(level: number): number {
  const difficulty = getDifficulty(level);
  return MAX_INTERVAL - difficulty * (MAX_INTERVAL - EXPERT_MAX_INTERVAL);
}

export function getDifficulty(level: number): number {
  const boundedLevel = clamp(1, level, LAST_LEVEL);
  return Math.pow(boundedLevel - 1, 2) / Math.pow(LAST_LEVEL - 1, 2);
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
