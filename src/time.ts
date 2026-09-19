import type { Timestamp } from './types';

const TimeUnits = {
  DAY: 24 * 60 * 60 * 1000,
  HOUR: 60 * 60 * 1000,
  MINUTE: 60 * 1000,
  SECOND: 1000,
} as const;

function now(): Timestamp {
  return Date.now();
}

function formatDate(date: number | Date): string {
  return new Date(date).toISOString().replace(/\.[\dZ]+/, '').replace('T', ' ');
}

function formatDuration(duration: number, unitsToPad = 0): string {
  const minLength = unitsToPad * 2 + (unitsToPad - 1);
  let remainder = duration;
  let output = '';

  for (const unit in TimeUnits) {
    if (Object.prototype.hasOwnProperty.call(TimeUnits, unit)) {
      const amount = Math.floor(remainder / TimeUnits[unit as keyof typeof TimeUnits]);

      if (output !== '') {
        output += ':' + (amount < 10 ? '0' : '') + amount;
      } else if (amount > 0) {
        output += amount;
      }
      remainder -= amount * TimeUnits[unit as keyof typeof TimeUnits];
    }
  }
  if (output.length < minLength) {
    output = '00:00:00:00'.substr(0, minLength - output.length) + output;
  }
  return output;
}

export default {
  TimeUnits,
  now,
  formatDate,
  formatDuration,
};
