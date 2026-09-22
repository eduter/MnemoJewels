import { DEFAULT_GROUP_SIZE, LAST_LEVEL } from './constants';
import events from './events';
import time from './time';
import board from './board';
import cards from './cards';
import score from './score';
import {
  createPacingState,
  getAverageThinkingTime,
  getDifficulty,
  getSpawnDelay,
  recordMatch,
  recordMismatch,
} from './pacing';
import type {
  GameOverEventData,
  MatchEventData,
  MismatchEventData,
} from './types';

const POINTS_PER_LEVEL = 1000;

let gameStart: number;
let level = 1;
let increment: number;
let ffScopeSize: number;
let pacingState = createPacingState();
let intervalBetweenGroups = 0;

(function setup() {
  events.bind('match', onMatch);
  events.bind('mismatch', onMismatch);
  events.bind('scoreUp', onScoreUp);
})();

function startGame(): void {
  pacingState = createPacingState();
  level = 1;
  const t = cards.getTotalCards();
  ffScopeSize = saturate(30, 0.1 * t, 100);
  increment = saturate(
    3,
    (t - ffScopeSize) / (5 * 60 * 1000 / getAverageThinkingTime(pacingState)),
    10,
  );
  intervalBetweenGroups = getIntervalBetweenGroups(DEFAULT_GROUP_SIZE);
  gameStart = time.now();
  board.initialize();
  events.trigger('gameStart');
}

function gameOver(): void {
  events.trigger('gameOver', {
    score: score.getScore(),
    gameStart,
    gameEnd: time.now(),
    level,
  } satisfies GameOverEventData);

  cards.debugReview();
}

function selectJewel(piRow: number, piCol: number): void {
  board.selectJewel(piRow, piCol);
}

function onMatch(eventData: unknown): void {
  const data = eventData as MatchEventData;
  const remainingCards = data.cardsInGroup.length - 1;
  ffScopeSize += increment;
  recordMatch(pacingState, remainingCards, data.thinkingTime);
}

function onMismatch(eventData: unknown): void {
  const data = eventData as MismatchEventData;
  ffScopeSize -= Math.max(5, 0.1 * ffScopeSize);
  recordMismatch(pacingState, data.thinkingTime);
}

function onScoreUp(): void {
  const updatedLevel = Math.min(
    LAST_LEVEL,
    Math.floor(score.getScore() / POINTS_PER_LEVEL) + 1,
  );
  if (updatedLevel > level) {
    level = updatedLevel;
    events.trigger('levelUp', { level });
  }
}

function getScopeSize(): number {
  return saturate(3, Math.round(ffScopeSize), cards.getTotalCards());
}

function saturate(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getIntervalBetweenGroups(numCards: number): number {
  intervalBetweenGroups = getSpawnDelay(pacingState, numCards, level);
  return intervalBetweenGroups;
}

export default {
  startGame,
  gameOver,
  selectJewel,
  getScopeSize,
  getLevel: function () { return level; },
  getDifficulty: function () { return getDifficulty(level); },
  getIntervalBetweenGroups,
  getInterval: function () { return intervalBetweenGroups; },
};
