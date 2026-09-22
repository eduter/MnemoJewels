import utils, { getSpawnProgress } from '../src/utils';

describe('dynamic interval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a single callback chain and waits before the first callback', () => {
    const callback = vi.fn();
    const schedules: { startedAt: number; delay: number }[] = [];
    const intervalId = utils.setDynamicInterval(
      callback,
      () => 1000,
      schedule => schedules.push(schedule),
    );

    expect(callback).not.toHaveBeenCalled();
    expect(schedules).toEqual([{ startedAt: Date.now(), delay: 1000 }]);

    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(schedules).toHaveLength(2);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    utils.clearInterval(intervalId);
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(utils.getDynamicIntervalSchedule(intervalId)).toBeNull();
  });

  it('uses the latest dynamic delay for each new window', () => {
    let delay = 8000;
    const callback = vi.fn(() => { delay = 5000; });
    const intervalId = utils.setDynamicInterval(callback, () => delay);

    expect(utils.getDynamicIntervalSchedule(intervalId)?.delay).toBe(8000);
    vi.advanceTimersByTime(8000);
    expect(callback).toHaveBeenCalledOnce();
    expect(utils.getDynamicIntervalSchedule(intervalId)?.delay).toBe(5000);

    utils.clearInterval(intervalId);
  });

  it('does not schedule another timeout if the callback clears the interval', () => {
    const callback = vi.fn(() => {
      utils.clearInterval(intervalId);
    });
    const intervalId = utils.setDynamicInterval(callback, () => 1000);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(utils.getDynamicIntervalSchedule(intervalId)).toBeNull();
  });

  it('can start a new chain after the previous one is cleared', () => {
    const first = vi.fn();
    const firstId = utils.setDynamicInterval(first, () => 1000);
    utils.clearInterval(firstId);

    const second = vi.fn();
    const secondId = utils.setDynamicInterval(second, () => 1000);
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    utils.clearInterval(secondId);
  });

  it('maps an active spawn window to progress from empty to full', () => {
    const startedAt = Date.now();
    expect(getSpawnProgress(startedAt, 8000, startedAt)).toBe(0);
    expect(getSpawnProgress(startedAt, 8000, startedAt + 4000)).toBe(0.5);
    expect(getSpawnProgress(startedAt, 8000, startedAt + 8000)).toBe(1);
    expect(getSpawnProgress(startedAt, 8000, startedAt + 9000)).toBe(1);
    expect(getSpawnProgress(startedAt, 0, startedAt)).toBe(1);
  });
});
