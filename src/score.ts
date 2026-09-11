import events from './events';
import storage from './storage';
import decks from './decks';
import utils from './utils';
import States from './States';
import Card from './Card';
import type { GameOverEventData, MatchEventData, TopScore } from './types';

const MAX_TOP_SCORES = 10;

let score = 0;
let consecutiveMatches = 0;
let topScores: TopScore[] = [];

(function setup() {
  events.bind('storageReady', function () {
    topScores = storage.load<TopScore[]>('topScores') || [];
  });
  events.bind('gameStart', onGameStart);
  events.bind('gameOver', updateTopScores);
  events.bind('match', onMatch);
  events.bind('mismatch', onMismatch);
})();

function onGameStart(): void {
  score = 0;
  consecutiveMatches = 0;
}

function updateTopScores(eventData: unknown): void {
  const data = eventData as GameOverEventData;
  let rank = topScores.length;
  while (rank > 0 && score > topScores[rank - 1].points) {
    rank--;
  }
  const selectedDeck = decks.getSelectedDeck();
  if (rank < MAX_TOP_SCORES && selectedDeck) {
    topScores.splice(rank, 0, {
      points: score,
      deckId: selectedDeck.id,
      start: data.gameStart,
      end: data.gameEnd,
    });
    if (topScores.length > MAX_TOP_SCORES) {
      topScores.pop();
    }
    storage.store('topScores', topScores);
  }
  console.dir({ topScores });
}

function onMatch(eventData: unknown): void {
  const data = eventData as MatchEventData;
  const cardId = data.cardId;
  const cardsInGroup = data.cardsInGroup;
  let card: Card | undefined;

  for (let i = 0; i < cardsInGroup.length; i++) {
    const groupCard = cardsInGroup[i];
    if (groupCard instanceof Card && groupCard.id === cardId) {
      card = groupCard;
      break;
    } else if (groupCard.id === cardId) {
      card = groupCard as Card;
      break;
    }
  }

  if (!card) {
    throw new Error(`Card ${cardId} not found in group`);
  }

  let pointsEarned = 0;
  switch (card.state) {
    case States.LAPSE: pointsEarned = 5; break;
    case States.KNOWN: pointsEarned = 17; break;
    case States.NEW: pointsEarned = 30; break;
    case States.LEARNING: pointsEarned = 35; break;
    default: throw new Error('Unknown card state (' + card.state + ')');
  }
  if (card.state === States.KNOWN) {
    if (card.relativeScheduling! < 0) {
      pointsEarned += Math.max(-10, 20 * card.relativeScheduling!);
    } else {
      pointsEarned += Math.min(10, 10 * card.relativeScheduling!);
    }
    pointsEarned = Math.round(pointsEarned);
  }
  score += pointsEarned;
  events.trigger('scoreUp', {
    points: pointsEarned,
    reason: 'match',
  });

  consecutiveMatches++;
  if (consecutiveMatches % 100 === 0) {
    const bonusFactor = consecutiveMatches / 1000;
    const bonusPoints = Math.round(bonusFactor * score);
    score += bonusPoints;
    events.trigger('scoreUp', {
      points: bonusPoints,
      reason: 'streakBonus',
      streakLength: consecutiveMatches,
      bonus: '+' + (bonusFactor * 100) + '%',
    });
  }
}

function onMismatch(): void {
  consecutiveMatches = 0;
}

function getTopScores(): TopScore[] {
  return utils.copyData(topScores);
}

export default {
  getScore: function () { return score; },
  getTopScores,
  MAX_TOP_SCORES,
};
