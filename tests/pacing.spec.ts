import {
  createPacingState,
  getSpawnDelay,
  recordMatch,
  recordMismatch,
} from '../src/pacing';
import {
  EXPERT_MAX_INTERVAL,
  INITIAL_INTERVAL,
  MAX_INTERVAL,
  MIN_INTERVAL,
} from '../src/constants';

describe('adaptive pacing', () => {
  it('starts at the intended beginner pace', () => {
    const state = createPacingState();

    expect(getSpawnDelay(state, 3, 1)).toBe(INITIAL_INTERVAL);
  });

  it('accelerates gradually after repeated fast matches without crossing the safe floor', () => {
    const state = createPacingState();
    const initialDelay = getSpawnDelay(state, 3, 1);

    recordMatch(state, 2, 700);
    expect(getSpawnDelay(state, 3, 1)).toBeLessThan(initialDelay);
    expect(getSpawnDelay(state, 3, 1)).toBeGreaterThan(MIN_INTERVAL);

    for (let index = 0; index < 100; index++) {
      recordMatch(state, index % 3, 200);
    }
    expect(getSpawnDelay(state, 3, 1)).toBe(MIN_INTERVAL);
  });

  it('slows down promptly after a mismatch', () => {
    const state = createPacingState();
    for (let index = 0; index < 12; index++) {
      recordMatch(state, index % 3, 900);
    }
    const fastDelay = getSpawnDelay(state, 3, 1);

    recordMismatch(state, 6000);

    expect(getSpawnDelay(state, 3, 1)).toBeGreaterThan(fastDelay);
  });

  it('gives a crowded board more time while respecting the level cap', () => {
    const state = createPacingState();

    expect(getSpawnDelay(state, 8, 1)).toBeGreaterThan(getSpawnDelay(state, 3, 1));
    expect(getSpawnDelay(state, 8, 1)).toBe(MAX_INTERVAL);
    expect(getSpawnDelay(state, 8, 10)).toBe(EXPERT_MAX_INTERVAL);
  });

  it('starts fresh when a new pacing state is created', () => {
    const firstRun = createPacingState();
    recordMismatch(firstRun, 9000);

    const nextRun = createPacingState();
    expect(getSpawnDelay(nextRun, 3, 1)).toBe(INITIAL_INTERVAL);
  });
});
