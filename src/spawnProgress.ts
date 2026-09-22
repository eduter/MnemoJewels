import type { SpawnScheduledEventData } from './types';

export interface SpawnProgress {
  percent: number;
  remaining: number;
}

export function getSpawnProgress(
  schedule: SpawnScheduledEventData,
  now: number,
): SpawnProgress {
  const elapsed = Math.max(0, now - schedule.startedAt);
  const remaining = Math.max(0, schedule.delay - elapsed);
  const percent = schedule.delay === 0
    ? 100
    : Math.min(100, elapsed / schedule.delay * 100);

  return { percent, remaining };
}
