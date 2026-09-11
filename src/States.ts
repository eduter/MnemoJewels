import type { State } from './types';

const States = {
  NEW: 1 as State,
  LEARNING: 2 as State,
  KNOWN: 3 as State,
  LAPSE: 4 as State,
} as const;

export default States;
