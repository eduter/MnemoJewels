import {
  createPacingState,
  getLevelMaximum,
  getSpawnDelay,
  getTargetRows,
  recordMatch,
  recordMismatch,
} from '../src/pacing';
import {
  EXPERT_MAX_INTERVAL,
  INITIAL_INTERVAL,
  LAST_LEVEL,
  MAX_INTERVAL,
  MIN_INTERVAL,
} from '../src/constants';

describe('adaptive pacing', () => {
  it('starts at the intended beginner pace before any match', () => {
    const state = createPacingState();

    expect(getSpawnDelay(state, 3, 1)).toBe(INITIAL_INTERVAL);
  });

  it('targets a fuller board as the level rises', () => {
    expect(getTargetRows(1)).toBe(4);
    expect(getTargetRows(LAST_LEVEL)).toBe(8);
    expect(getTargetRows(5)).toBeGreaterThan(getTargetRows(1));
  });

  it('tightens the slowest allowed interval as the level rises', () => {
    expect(getLevelMaximum(1)).toBe(MAX_INTERVAL);
    expect(getLevelMaximum(LAST_LEVEL)).toBe(EXPERT_MAX_INTERVAL);
    expect(getLevelMaximum(5)).toBeGreaterThan(getLevelMaximum(LAST_LEVEL));
  });

  it('projects an interval to land the next group on the target', () => {
    const state = createPacingState();
    recordMatch(state, 2, 2000); // measured pace: 2s per pair
    recordMatch(state, 1, 2000);
    recordMatch(state, 0, 2000);

    // Level-1 target is 4, so from 3 rows the next group would make 6 and the
    // player must clear 2 pairs first: (3 + 3 - 4) * 2000ms.
    expect(getSpawnDelay(state, 3, 1)).toBe(4000);
    // A board with room to spare spawns as soon as allowed.
    expect(getSpawnDelay(state, 0, 1)).toBe(MIN_INTERVAL);
  });

  it('slows down as the board fills and speeds up as it drains', () => {
    const state = createPacingState();
    recordMatch(state, 2, 2000);
    recordMatch(state, 1, 2000);
    recordMatch(state, 0, 2000);

    const roomy = getSpawnDelay(state, 5, 1);
    const crowded = getSpawnDelay(state, 9, 1);
    expect(crowded).toBeGreaterThan(roomy);
  });

  it('never asks for less than the floor or more than the level cap', () => {
    const state = createPacingState();
    recordMatch(state, 2, 200);
    recordMatch(state, 1, 200);
    recordMatch(state, 0, 200);

    expect(getSpawnDelay(state, 3, 1)).toBe(MIN_INTERVAL);
    recordMismatch(state, MAX_INTERVAL);
    expect(getSpawnDelay(state, 10, 1)).toBe(MAX_INTERVAL);
    expect(getSpawnDelay(state, 10, LAST_LEVEL)).toBe(EXPERT_MAX_INTERVAL);
  });

  it('lets a mismatch pull the pace down, then re-learns on fast matches', () => {
    const state = createPacingState();
    for (let index = 0; index < 20; index++) {
      recordMatch(state, index % 3, 800);
    }
    const fastDelay = getSpawnDelay(state, 6, 1);

    recordMismatch(state, 6000);
    const panickedDelay = getSpawnDelay(state, 6, 1);
    expect(panickedDelay).toBeGreaterThan(fastDelay);

    for (let index = 0; index < 50; index++) {
      recordMatch(state, index % 3, 800);
    }
    expect(getSpawnDelay(state, 6, 1)).toBeLessThan(panickedDelay);
    expect(getSpawnDelay(state, 10, 1)).toBe(MAX_INTERVAL);
  });

  it('starts fresh when a new pacing state is created', () => {
    const firstRun = createPacingState();
    recordMismatch(firstRun, 9000);

    const nextRun = createPacingState();
    expect(getSpawnDelay(nextRun, 3, 1)).toBe(INITIAL_INTERVAL);
  });
});
