import {
  createPacingState,
  getLevelMaximum,
  getMismatchFreezeDuration,
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
  MAX_MISMATCH_FREEZE,
  MIN_INTERVAL,
  MIN_MISMATCH_FREEZE,
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

  describe('mismatch freeze', () => {
    it('is half the interval the player is on', () => {
      const state = createPacingState();
      recordMatch(state, 2, 2000);
      recordMatch(state, 1, 2000);
      recordMatch(state, 0, 2000);

      // (3 + 3 - 4) * 2000 = 4000ms interval -> 2000ms freeze.
      const interval = getSpawnDelay(state, 3, 1);
      expect(interval).toBe(4000);
      expect(getMismatchFreezeDuration(state, 3, 1)).toBe(interval / 2);
    });

    it('gives a slow player longer to read than a fast one', () => {
      const fast = createPacingState();
      const slow = createPacingState();
      for (let index = 0; index < 20; index++) {
        recordMatch(fast, index % 3, 1200);
        recordMatch(slow, index % 3, 4000);
      }

      const fastFreeze = getMismatchFreezeDuration(fast, 6, 1);
      const slowFreeze = getMismatchFreezeDuration(slow, 6, 1);
      expect(slowFreeze).toBeGreaterThan(fastFreeze);
    });

    it('never drops below the time it has always been', () => {
      const state = createPacingState();
      for (let index = 0; index < 20; index++) {
        recordMatch(state, index % 3, 400);
      }

      expect(getMismatchFreezeDuration(state, 0, 1)).toBe(MIN_MISMATCH_FREEZE);
    });

    it('never grows beyond the cap', () => {
      const state = createPacingState();
      recordMismatch(state, MAX_INTERVAL);
      recordMismatch(state, MAX_INTERVAL);

      expect(getMismatchFreezeDuration(state, 10, 1)).toBe(MAX_MISMATCH_FREEZE);
    });

    it('is half the friendly start interval before any match is observed', () => {
      const state = createPacingState();

      expect(getMismatchFreezeDuration(state, 3, 1)).toBe(INITIAL_INTERVAL / 2);
    });
  });
});
