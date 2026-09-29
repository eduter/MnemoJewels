import { MAX_LEARNING } from './constants';
import events from './events';
import game from './game';
import decks from './decks';
import time from './time';
import utils from './utils';
import Card from './Card';
import States from './States';
import TimeMeter from './TimeMeter';
import { cardDistance as computeCardDistance, createDistanceContext, mappedCardsConflict } from './alternativeSelection';
import type { DistanceContext } from './alternativeSelection';
import type {
  Deck,
  DeckSelectedEventData,
  MatchEventData,
  MismatchEventData,
  State,
  StateStat,
  WordDiff,
} from './types';

const TimeUnits = time.TimeUnits;

const MAX_CANDIDATES = 30;
const ACCEPTABLE_MISMATCHES = 30;

let allCards: Card[] = [];
let wordMappings: Record<string, string[]> | null = null;
let distanceContext: DistanceContext | null = null;
let deck: Deck | null = null;

// Card distance is invariant for a deck and the same pair recurs across a
// session, so memoize it. Module scoped: kept until the deck changes.
const cardDistanceCache = new Map<number, number>();
const indexes: Record<State, Card[]> = {
  1: [],
  2: [],
  3: [],
  4: [],
};
let mismatchCount = 0;
const cardsInGame: Card[] = [];

const cmpFuncs: Record<State, (c1: Card, c2: Card) => number> = {
  1: cmpId,
  2: cmpRelativeScheduling,
  3: cmpRelativeScheduling,
  4: cmpNextRep,
};

class Iterator {
  private state = 0;
  private card = -1;

  constructor(private readonly priorities: State[]) {}

  reset(): void {
    this.state = 0;
    this.card = -1;
  }

  hasNext(): boolean {
    if (this.card < indexes[this.priorities[this.state]].length - 1) {
      return true;
    }
    for (let i = this.state + 1; i < this.priorities.length; i++) {
      if (indexes[this.priorities[i]].length > 0) {
        return true;
      }
    }
    return false;
  }

  next(): Card | null {
    let n: Card | null = null;

    if (this.hasNext()) {
      do {
        if (this.card < indexes[this.priorities[this.state]].length - 1) {
          this.card++;
        } else {
          this.state++;
          this.card = 0;
        }
        n = indexes[this.priorities[this.state]][this.card];
      } while (n == null);
    }
    return n;
  }

  toString(): string {
    return 'state: ' + this.state + ' card: ' + this.card + ' priorities: [' + this.priorities.join(', ') + ']';
  }
}

const iterators: Record<string, Iterator> = {
  learning: new Iterator([States.LAPSE, States.NEW, States.LEARNING, States.KNOWN]),
  reviewing: new Iterator([States.LAPSE, States.LEARNING, States.KNOWN, States.NEW]),
  alternatives: new Iterator([States.KNOWN, States.LEARNING, States.LAPSE, States.NEW]),
};

(function setup() {
  const selectedDeck = decks.getSelectedDeck();

  unloadDeck();
  if (selectedDeck !== null) {
    loadDeck(selectedDeck);
  }

  events.bind('deckSelected', function (eventData: unknown) {
    loadDeck((eventData as DeckSelectedEventData).deck);
  });
  events.bind('match', rescheduleMatch);
  events.bind('mismatch', rescheduleMismatch);
  events.bind('gameOver', reindexCardInGame);
  events.bind('gameOver', persistCards);
  events.bind('exitApp', persistCards);
})();

function reindexCardInGame(): void {
  while (cardsInGame.length > 0) {
    moveToIndex(cardsInGame[0]);
  }
}

function persistCards(): void {
  if (deck !== null) {
    decks.storeCards(allCards);
  }
}

function loadDeck(deckToLoad: Deck): void {
  unloadDeck();
  deck = deckToLoad;
  allCards = decks.loadCards(deckToLoad.id);
  allCards.forEach(function (card) {
    indexes[card.state].push(card);
    if (card.isMismatched) {
      mismatchCount++;
    }
  });
  sortIndexes();
  updateWordMappings();
  updateNormalizations();
}

function unloadDeck(): void {
  deck = null;
  allCards = [];
  mismatchCount = 0;
  cardDistanceCache.clear();
  updateWordMappings();
  updateNormalizations();
  clearIndexes();
}

function clearIndexes(): void {
  for (const s in States) {
    if (Object.prototype.hasOwnProperty.call(States, s)) {
      indexes[States[s as keyof typeof States]] = [];
    }
  }
}

function sortIndexes(): void {
  for (const s in States) {
    if (Object.prototype.hasOwnProperty.call(States, s)) {
      const state = States[s as keyof typeof States];
      indexes[state].sort(cmpFuncs[state]);
    }
  }
}

function updateWordMappings(): void {
  wordMappings = {};
  for (const cardId in allCards) {
    if (Object.prototype.hasOwnProperty.call(allCards, cardId)) {
      const front = allCards[cardId].front;
      const back = allCards[cardId].back;
      if (front in wordMappings) {
        if (wordMappings[front].indexOf(back) === -1) {
          wordMappings[front].push(back);
        }
      } else {
        wordMappings[front] = [back];
      }
    }
  }
}

function updateNormalizations(): void {
  if (!deck) {
    distanceContext = null;
    return;
  }

  distanceContext = createDistanceContext(
    Object.values(allCards),
    deck.pronunciations,
    deck.languageFront,
    deck.languageBack,
  );
}

function toWordMap(words: [string, string][]): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  for (let i = 0; i < words.length; i++) {
    const front = words[i][0];
    const back = words[i][1];
    if (map[front]) {
      if (map[front].indexOf(back) === -1) {
        map[front].push(back);
      }
    } else {
      map[front] = [back];
    }
  }
  return map;
}

function inWordMap(map: Record<string, string[]>, front: string, back: string): boolean {
  return !!(map[front] && map[front].indexOf(back) >= 0);
}

function diff(wordList: [string, string][]): WordDiff {
  const map = toWordMap(wordList);
  const add: [string, string][] = [];
  const remove: string[] = [];

  for (let i = 0; i < wordList.length; i++) {
    if (!wordMappings || !inWordMap(wordMappings, wordList[i][0], wordList[i][1])) {
      add.push(wordList[i]);
    }
  }

  for (const id in allCards) {
    if (Object.prototype.hasOwnProperty.call(allCards, id)) {
      if (!inWordMap(map, allCards[id].front, allCards[id].back)) {
        remove.push(id);
      }
    }
  }

  return { add, remove };
}

function conflicts(card: Card, cards: Card[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    if (cardsConflict(card, cards[i])) {
      return true;
    }
  }
  return false;
}

function cardsConflict(card1: Card, card2: Card): boolean {
  if (!wordMappings) {
    return false;
  }
  return mappedCardsConflict(card1, card2, wordMappings);
}

function createNewGroup(groupSize: number): Card[] {
  console.group('createNewGroup');
  const firstCard = chooseFirstCard();
  TimeMeter.start('CA');
  const alternatives = chooseAlternatives(groupSize, firstCard);
  TimeMeter.stop('CA');
  const group = [firstCard].concat(alternatives);

  for (let i = 0; i < group.length; i++) {
    moveToGame(group[i]);
    console.log(group[i].toString());
  }
  console.groupEnd();
  return group;
}

function chooseFirstCard(): Card {
  const i = chooseFirstCardIterator();
  i.reset();
  while (i.hasNext()) {
    const card = i.next();
    if (card && !card.isSuspended() && !conflicts(card, cardsInGame)) {
      return card;
    }
  }
  throw new Error('Impossible to create a group - no more cards available.');
}

function chooseAlternatives(groupSize: number, firstCard: Card): Card[] {
  const candidatesPerDistance: Card[][] = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], []];
  let card: Card;
  let distance: number;

  const accumulatedLength = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let cardsToGo = game.getScopeSize();
  const otherCards = cardsInGame.concat(firstCard);
  const i = chooseAlternativesIterator();
  i.reset();
  while (i.hasNext() && cardsToGo > 0) {
    card = i.next()!;
    if (!card.isSuspended() && !conflicts(card, otherCards)) {
      distance = Math.min(14, Math.round(3 * cardDistance(card, firstCard)));
      if (accumulatedLength[distance] < MAX_CANDIDATES) {
        candidatesPerDistance[distance].push(card);
        for (let j = distance; j < accumulatedLength.length; j++) {
          accumulatedLength[j]++;
        }
      }
    }
    cardsToGo--;
  }

  const alternatives: Card[] = [];
  for (distance = 0; distance < candidatesPerDistance.length && alternatives.length < groupSize - 1; distance++) {
    if (candidatesPerDistance[distance] !== undefined) {
      for (let c = 0; c < candidatesPerDistance[distance].length; c++) {
        card = candidatesPerDistance[distance][c];
        if (!conflicts(card, alternatives)) {
          alternatives.push(card);
          if (alternatives.length === groupSize - 1) {
            break;
          }
        }
      }
    }
  }
  return alternatives;
}

function chooseFirstCardIterator(): Iterator {
  const pl = probabilityLearningFirstCard();
  const probabilities = {
    learning: pl,
    reviewing: 1 - pl,
  };
  return iterators[utils.weighedRandom(probabilities)];
}

function chooseAlternativesIterator(): Iterator {
  const pl = probabilityLearningAlternatives();
  const probabilities = {
    learning: pl,
    alternatives: 1 - pl,
  };
  return iterators[utils.weighedRandom(probabilities)];
}

function probabilityLearningFirstCard(): number {
  const learningSetSize = indexes[States.LAPSE].length + indexes[States.LEARNING].length;
  const learningSetFullness = Math.min(learningSetSize / MAX_LEARNING, 1);
  return 1 - (1 - game.getDifficulty()) * learningSetFullness;
}

function probabilityLearningAlternatives(): number {
  const b = Math.min(cardsInGame.length / 7, 1);
  const m = Math.min(mismatchCount / ACCEPTABLE_MISMATCHES, 1);

  return (1 - b) * (1 - 0.9 * m);
}

function cardDistance(candidateCard: Card, card: Card): number {
  if (!distanceContext) {
    return 0;
  }
  const key = card.id * allCards.length + candidateCard.id;
  const cached = cardDistanceCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const distance = computeCardDistance(candidateCard, card, distanceContext);
  cardDistanceCache.set(key, distance);
  return distance;
}

function moveToIndex(card: Card): void {
  const index = indexes[card.state];
  const position = -index.binarySearch(card, cmpFuncs[card.state]);
  index.splice(position, 0, card);

  if (card.isMismatched) {
    mismatchCount++;
  }

  for (let i = 0; i < cardsInGame.length; i++) {
    if (cardsInGame[i].id === card.id) {
      cardsInGame.splice(i, 1);
    }
  }
}

function moveToGame(card: Card): void {
  const index = indexes[card.state];
  const position = index.binarySearch(card, cmpFuncs[card.state]);
  index.splice(position, 1);

  if (card.isMismatched) {
    mismatchCount--;
  }

  cardsInGame.push(card);
}

function rescheduleMatch(eventData: unknown): void {
  const data = eventData as MatchEventData;
  console.group('rescheduleMatch');
  const cardsInGroup: Card[] = data.cardsInGroup.map(ref => allCards[ref.id]);
  const groupSize = cardsInGroup.length;

  for (let i = 0; i < groupSize; i++) {
    const match = cardsInGroup[i].id === data.cardId;
    console.log((match ? 'v ' : '  ') + cardsInGroup[i].toString());
  }

  const card = allCards[data.cardId];
  const now = time.now();

  if (groupSize > 1) {
    const minInterval = groupSize * 1000 / data.thinkingTime * TimeUnits.DAY;

    if (card.lastRep) {
      const scheduledInterval = card.nextRep! - card.lastRep;
      const actualInterval = now - card.lastRep;
      const multiplier = card.easiness * (groupSize - 1) / 2;
      const nextInterval = Math.max(minInterval, multiplier * actualInterval, scheduledInterval * 1.1);
      card.setSchedule(now, Math.floor(now + nextInterval));
    } else {
      card.setSchedule(now, Math.floor(now + minInterval));
    }
    card.match();
  }
  card.suspend(now + groupSize * 30 * TimeUnits.SECOND);
  moveToIndex(card);
  console.groupEnd();
}

function debugReview(): void {
  const learning = indexes[States.LAPSE].length + indexes[States.LEARNING].length;
  const i = iterators.reviewing;
  let l = 0;

  console.group('debugReview (learning = ' + learning + ')');
  i.reset();
  while (i.hasNext() && l < learning) {
    const card = i.next();
    if (card) {
      console.log(card.toString());
    }
    l++;
  }
  console.groupEnd();
}

function rescheduleMismatch(eventData: unknown): void {
  const data = eventData as MismatchEventData;
  console.group('rescheduleMismatch');
  const mismatchedCards = data.mismatchedCards;
  const cardsInGroup: Card[] = data.cardsInGroup.map(ref => allCards[ref.id]);
  let card: Card;

  for (let j = 0; j < cardsInGroup.length; j++) {
    const mismatch = mismatchedCards.indexOf(cardsInGroup[j].id) > -1;
    console.log((mismatch ? 'X ' : '  ') + cardsInGroup[j].toString());
  }

  const now = time.now();
  const nextRep = now + 2 * TimeUnits.MINUTE;
  for (let m = 0; m < mismatchedCards.length; m++) {
    card = allCards[mismatchedCards[m]];
    card.setSchedule(now, nextRep);
    card.mismatch();
  }
  for (let i = 0; i < cardsInGroup.length; i++) {
    card = cardsInGroup[i];
    card.suspend(now + 15 * TimeUnits.SECOND);
    moveToIndex(card);
  }
  console.groupEnd();
}

function getStatesStats(): StateStat[] {
  const stats: StateStat[] = [];
  for (const stateName in States) {
    if (Object.prototype.hasOwnProperty.call(States, stateName)) {
      const stateCode = States[stateName as keyof typeof States];
      stats.push({ state: stateName, count: indexes[stateCode].length });
    }
  }
  return stats;
}

function getTotalCards(): number {
  return deck ? deck.size : 0;
}

function cmpRelativeScheduling(c1: Card, c2: Card): number {
  return (c2.relativeScheduling! - c1.relativeScheduling!) || cmpId(c1, c2);
}

function cmpNextRep(c1: Card, c2: Card): number {
  return (c1.nextRep! - c2.nextRep!) || cmpId(c1, c2);
}

function cmpId(c1: Card, c2: Card): number {
  return c1.id - c2.id;
}

Array.prototype.binarySearch = function <T>(searchElement: T, cmpFunc: (a: T, b: T) => number): number {
  let currentIndex: number;
  let currentElement: T;
  let cmpRes: number;
  let minIndex = 0;
  let maxIndex = this.length - 1;

  while (minIndex <= maxIndex) {
    currentIndex = (minIndex + maxIndex) / 2 | 0;
    currentElement = this[currentIndex];
    cmpRes = cmpFunc(currentElement, searchElement);
    if (cmpRes < 0) {
      minIndex = currentIndex + 1;
    } else if (cmpRes > 0) {
      maxIndex = currentIndex - 1;
    } else {
      return currentIndex;
    }
  }
  return ~maxIndex;
};

export default {
  createNewGroup,
  getStatesStats,
  getTotalCards,
  diff,
  debugReview,
  probabilityLearningFirstCard,
  probabilityLearningAlternatives,
};
