import { NUM_ROWS, DEFAULT_GROUP_SIZE, MISMATCH_PENALTY_TIME } from './constants';
import events from './events';
import cards from './cards';
import game from './game';
import time from './time';
import utils from './utils';
import animationState from './animationState';
import Jewel from './Jewel';
import type Card from './Card';
import type {
  BoardChangedEventData,
  JewelSelection,
  MatchEventData,
  MismatchEventData,
  SpawnScheduledEventData,
} from './types';

let faJewels: Jewel[][] = [[], []];
let faAvailableGroupIds: number[] = [];
const fmGroupCreationTime: Record<number, number> = {};
let fmSelectedJewel: JewelSelection | null = null;
let fiLastSelectionTime: number | null = null;
let intervalId: number | null = null;

function getOverlay(): HTMLElement {
  return document.getElementById('overlay')!;
}

function initialize(): void {
  stopAddingGroups();
  faJewels = [[], []];
  faAvailableGroupIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  Object.keys(fmGroupCreationTime).forEach(key => {
    delete fmGroupCreationTime[Number(key)];
  });
  fiLastSelectionTime = time.now();
  fmSelectedJewel = null;
  addDefaultGroup(false);
  startAddingGroups();
}

function addNewGroup(groupSize: number): void {
  const newGroup = cards.createNewGroup(groupSize);
  addGroup(newGroup);
}

function addDefaultGroup(notify = true): void {
  addNewGroup(DEFAULT_GROUP_SIZE);
  if (notify) {
    notifyBoardChanged({ reason: 'spawn' });
  }
}

function getNumCards(): number {
  return faJewels[0].length;
}

function addGroup(cardsToAdd: Card[]): void {
  const frontJewels: Jewel[] = [];
  const backJewels: Jewel[] = [];
  const groupId = getNextGroupId();
  fmGroupCreationTime[groupId] = time.now();

  for (let i = 0; i < cardsToAdd.length; i++) {
    const card = cardsToAdd[i];
    frontJewels.push(new Jewel(groupId, card, true));
    backJewels.push(new Jewel(groupId, card, false));
  }
  while (frontJewels.length) {
    if (getNumCards() < NUM_ROWS) {
      faJewels[0].push(utils.randomPop(frontJewels));
      faJewels[1].push(utils.randomPop(backJewels));
    } else {
      gameOver();
      return;
    }
  }
}

function gameOver(): void {
  stopAddingGroups();
  getOverlay().style.display = 'none';
  game.gameOver();
}

function getNextGroupId(): number {
  return faAvailableGroupIds.shift()!;
}

function selectJewel(piRow: number, piCol: number): void {
  if (!animationState.isInteractive()) {
    return;
  }

  const miSelectionTime = time.now();
  let selectionChanged = false;

  if (piRow < faJewels[0].length) {
    if (fmSelectedJewel == null) {
      fmSelectedJewel = { row: piRow, col: piCol };
      selectionChanged = true;
    } else if (piCol === fmSelectedJewel.col) {
      fmSelectedJewel.row = piRow;
      selectionChanged = true;
    } else {
      const prevSelectedJewel = faJewels[fmSelectedJewel.col][fmSelectedJewel.row];
      const newSelectedJewel = faJewels[piCol][piRow];

      if (prevSelectedJewel.groupId === newSelectedJewel.groupId) {
        const miPrevSelectedId = prevSelectedJewel.card.id;
        const miNewSelectedId = newSelectedJewel.card.id;

        // Clear before resolving: match/mismatch re-render the board, and a
        // stale selection would be painted onto whichever jewel shifted into
        // its coordinates.
        fmSelectedJewel = null;
        if (miNewSelectedId === miPrevSelectedId) {
          match(miNewSelectedId, miSelectionTime);
        } else {
          mismatch(miNewSelectedId, miPrevSelectedId, miSelectionTime);
        }
      }
    }
  } else {
    fmSelectedJewel = null;
    selectionChanged = true;
  }

  if (selectionChanged) {
    notifyBoardChanged({ reason: 'selection' });
  }
}

function match(cardId: number, selectionTime: number): void {
  const groupId = getGroup(cardId)!;
  const cardsInGroup = getCardsInGroup(groupId);
  const thinkingTime = selectionTime - Math.max(fiLastSelectionTime!, fmGroupCreationTime[groupId]);

  removeCard(cardId);
  fiLastSelectionTime = selectionTime;
  events.trigger('match', {
    cardId,
    cardsInGroup,
    thinkingTime,
  } satisfies MatchEventData);
  if (cardsInGroup.length === 1) {
    faAvailableGroupIds.push(groupId);
  }

  if (getNumCards() === 0) {
    stopAddingGroups();
    addDefaultGroup(false);
    startAddingGroups();
  }
  notifyBoardChanged({ reason: 'match', cardId });
}

function mismatch(cardId1: number, cardId2: number, selectionTime: number): void {
  const groupId = getGroup(cardId1)!;
  const cardsInGroup = getCardsInGroup(groupId);
  const thinkingTime = selectionTime - Math.max(fiLastSelectionTime!, fmGroupCreationTime[groupId]);

  const overlay = getOverlay();
  overlay.style.display = 'block';
  setTimeout(() => { overlay.style.display = 'none'; }, MISMATCH_PENALTY_TIME);

  removeGroup(groupId);
  addNewGroup(cardsInGroup.length);

  fiLastSelectionTime = selectionTime;
  events.trigger('mismatch', {
    mismatchedCards: [cardId1, cardId2],
    cardsInGroup,
    thinkingTime,
  } satisfies MismatchEventData);
  notifyBoardChanged({ reason: 'mismatch' });
}

function startAddingGroups(): void {
  intervalId = utils.setDynamicInterval(
    addDefaultGroup,
    getIntervalBetweenGroups,
    schedule => events.trigger('spawnScheduled', schedule satisfies SpawnScheduledEventData),
  );
}

function stopAddingGroups(): void {
  if (intervalId !== null) {
    utils.clearInterval(intervalId);
    intervalId = null;
  }
}

function getIntervalBetweenGroups(): number {
  return game.getIntervalBetweenGroups(getNumCards());
}

function getGroup(cardId: number): number | null {
  for (let i = 0; i < faJewels[0].length; i++) {
    if (faJewels[0][i].card.id === cardId) {
      return faJewels[0][i].groupId;
    }
  }
  return null;
}

function getCardsInGroup(groupId: number): Card[] {
  const groupCards: Card[] = [];

  for (let i = 0; i < faJewels[0].length; i++) {
    const jewel = faJewels[0][i];
    if (jewel.groupId === groupId) {
      groupCards.push(jewel.card);
    }
  }
  return groupCards;
}

function removeCard(cardId: number): void {
  for (let j = 0; j < faJewels.length; j++) {
    for (let i = 0; i < faJewels[j].length; i++) {
      if (faJewels[j][i].card.id === cardId) {
        faJewels[j].splice(i, 1);
        break;
      }
    }
  }
}

function removeGroup(groupId: number): void {
  const groupCards = getCardsInGroup(groupId);
  for (let i = 0; i < groupCards.length; i++) {
    removeCard(groupCards[i].id);
  }
  faAvailableGroupIds.push(groupId);
}

function getJewels(): Jewel[][] {
  return faJewels;
}

function getSelectedJewel(): JewelSelection | null {
  return fmSelectedJewel;
}

function notifyBoardChanged(data: BoardChangedEventData): void {
  events.trigger('boardChanged', data);
}

export default {
  initialize,
  selectJewel,
  getJewels,
  getSelectedJewel,
};
