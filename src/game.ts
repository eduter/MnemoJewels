import { INITIAL_INTERVAL, DEFAULT_GROUP_SIZE, MIN_INTERVAL, MAX_INTERVAL } from './constants';
import events from './events';
import navigation from './navigation';
import time from './time';
import board from './board';
import cards from './cards';
import display from './display';
import score from './score';
import TimeMeter from './TimeMeter';
import type { GameOverEventData, JewelSelection, MatchEventData } from './types';
import type Jewel from './Jewel';

const POINTS_PER_LEVEL = 1000;
const LAST_LEVEL = 10;

let gameStart: number;
let level = 1;
let increment: number;
let ffScopeSize: number;
const averageThinkingTimes = [
  INITIAL_INTERVAL / 6,
  INITIAL_INTERVAL / 3,
  INITIAL_INTERVAL / 2,
];
let intervalBetweenGroups: number;

(function setup() {
  events.bind('match', onMatch);
  events.bind('mismatch', onMismatch);
  events.bind('scoreUp', onScoreUp);
})();

function startGame(): void {
  const t = cards.getTotalCards();
  ffScopeSize = saturate(30, 0.1 * t, 100);
  increment = saturate(3, (t - ffScopeSize) / (5 * 60 * 1000 / getAverageThinkingTime()), 10);
  intervalBetweenGroups = getIntervalBetweenGroups(DEFAULT_GROUP_SIZE);
  gameStart = time.now();
  level = 1;
  board.initialize();
  events.trigger('gameStart');
}

function gameOver(): void {
  display.redraw(board.getJewels(), board.getSelectedJewel());
  alert('Game Over!');
  navigation.navigateTo('main-menu');
  events.trigger('gameOver', {
    score: score.getScore(),
    gameStart,
    gameEnd: time.now(),
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
  averageThinkingTimes[remainingCards] = 0.6 * averageThinkingTimes[remainingCards] + 0.4 * data.thinkingTime;
}

function onMismatch(): void {
  ffScopeSize -= Math.max(5, 0.1 * ffScopeSize);
}

function onScoreUp(): void {
  const updatedLevel = Math.min(LAST_LEVEL, Math.floor(score.getScore() / POINTS_PER_LEVEL) + 1);
  if (updatedLevel > level) {
    level = updatedLevel;
    events.trigger('levelUp', { level });
  }
}

function redraw(paJewels: Jewel[][] | null, pmSelectedJewel?: JewelSelection | null): void {
  if (paJewels) {
    display.redraw(paJewels, pmSelectedJewel ?? null);
  }
}

function getScopeSize(): number {
  return saturate(3, Math.round(ffScopeSize), cards.getTotalCards());
}

function saturate(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getIntervalBetweenGroups(numCards: number): number {
  if (numCards > 2) {
    intervalBetweenGroups = Math.min((numCards - 2) * getAverageThinkingTime(), getMaxInterval());
  } else {
    intervalBetweenGroups = MIN_INTERVAL;
  }
  return intervalBetweenGroups;
}

function getMaxInterval(): number {
  return MAX_INTERVAL - getDifficulty() * (MAX_INTERVAL - MIN_INTERVAL);
}

function getDifficulty(): number {
  return Math.pow(level - 1, 2) / Math.pow(LAST_LEVEL - 1, 2);
}

function getAverageThinkingTime(): number {
  return (averageThinkingTimes[0] + averageThinkingTimes[1] + averageThinkingTimes[2]) / 3;
}

export default {
  startGame,
  gameOver,
  selectJewel,
  redraw,
  getScopeSize,
  getLevel: function () { return level; },
  getDifficulty,
  getIntervalBetweenGroups,
  getStats: function () {
    return TimeMeter.getStats('CA') + ' '
      + TimeMeter.getStats('D')
      + ' 1st: ' + Math.round(100 * cards.probabilityLearningFirstCard())
      + ' alt: ' + Math.round(100 * cards.probabilityLearningAlternatives())
      + ' p: ' + Math.round(intervalBetweenGroups / 100) / 10
      + ' s: ' + getScopeSize();
  },
};
