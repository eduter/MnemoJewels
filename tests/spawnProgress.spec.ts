import { getSpawnProgress } from '../src/spawnProgress';

describe('spawn progress', () => {
  const schedule = { startedAt: 1000, delay: 9000 };

  it('tracks elapsed progress and remaining time from the scheduler window', () => {
    expect(getSpawnProgress(schedule, 1000)).toEqual({
      percent: 0,
      remaining: 9000,
    });
    expect(getSpawnProgress(schedule, 5500)).toEqual({
      percent: 50,
      remaining: 4500,
    });
  });

  it('clamps before and after the scheduled window', () => {
    expect(getSpawnProgress(schedule, 0)).toEqual({
      percent: 0,
      remaining: 9000,
    });
    expect(getSpawnProgress(schedule, 12000)).toEqual({
      percent: 100,
      remaining: 0,
    });
  });
});
