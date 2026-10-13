export const NUM_ROWS = 10;
export const DEFAULT_GROUP_SIZE = 3;
// Slowest interval ever scheduled (the floor). Low enough that a fast player
// is not pinned here while the board still has room, so the full board has a
// chance to drain before the next group arrives.
export const MIN_INTERVAL = 3000;
export const INITIAL_INTERVAL = 7000;
// Slowest interval the target-occupancy controller is allowed to ask for at
// level 1. The deadbeat target already slows the game as the board fills; this
// is the mercy backstop for a player who is losing ground.
export const MAX_INTERVAL = 18000;
// Slowest interval at LAST_LEVEL. Shrinking MAX_INTERVAL down to this is what
// makes later levels harder: a player cannot be given enough time to recover,
// so the board creeps up on them.
export const EXPERT_MAX_INTERVAL = 7500;
export const LAST_LEVEL = 10;
// The mismatch freeze dims the board and spotlights the correct answer. Its
// length is a fraction of the interval the player is currently on, so the pause
// tracks their pace: a fast player is held only briefly, while a struggling one
// gets longer to read the words. Bounded below by the time it has always been
// (so the feedback never becomes harder to read) and above so the freeze never
// turns into a punishment of its own.
export const MISMATCH_FREEZE_FRACTION = 0.5;
export const MIN_MISMATCH_FREEZE = 1500;
export const MAX_MISMATCH_FREEZE = 5000;
export const TILE_DROP_TIME = 340;
export const MATCH_FADE_TIME = 180;
export const MAX_LEARNING = 20;
