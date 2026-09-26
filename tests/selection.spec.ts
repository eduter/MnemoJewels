// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_INTERVAL, TILE_DROP_TIME } from '../src/constants';
import type { CardDto, Deck, JewelSelection } from '../src/types';
import type Jewel from '../src/Jewel';

const CARD_COUNT = 60;

let board: typeof import('../src/board').default;
let game: typeof import('../src/game').default;
let events: typeof import('../src/events').default;
let reducedMotion = true;

beforeAll(async () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: reducedMotion,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  window.requestAnimationFrame = callback => window.setTimeout(() => callback(0), 0);

  seedStorage();
  installDom();

  board = (await import('../src/board')).default;
  game = (await import('../src/game')).default;
  events = (await import('../src/events')).default;
  const storage = (await import('../src/storage')).default;
  await storage.setup();
  await import('../src/display');
});

beforeEach(() => {
  reducedMotion = true;
  game.startGame();
});

afterEach(() => {
  reducedMotion = true;
  vi.useRealTimers();
});

function seedStorage(): void {
  const cards: CardDto[] = [];
  for (let index = 0; index < CARD_COUNT; index++) {
    cards.push({ ft: `front-${index}`, bk: `back-${index}`, ea: 2.5, st: 1, lr: null, nr: null });
  }
  const deck: Deck = {
    id: 1,
    displayName: 'Test deck',
    size: CARD_COUNT,
    uid: 'top-no-en',
    version: 1,
    languageFront: 'no',
    languageBack: 'en',
  };
  localStorage.setItem('mj.decks', JSON.stringify([deck]));
  localStorage.setItem('mj.deck.1', JSON.stringify(cards));
  localStorage.setItem('mj.selectedDeck', JSON.stringify(1));
  localStorage.setItem('mj.modelVersion', JSON.stringify(2));
}

function installDom(): void {
  document.body.innerHTML = `
    <div id="stats">
      <span>SCORE: <strong id="score-value">0</strong></span>
      <span>LEVEL: <strong id="level-value">1</strong></span>
    </div>
    <div id="spawn-progress"><div class="spawn-progress-fill"></div></div>
    <div id="board-area">
      <table id="board-slots"><tr><td></td><td></td></tr></table>
      <div id="board" role="grid"></div>
      <div id="overlay"></div>
    </div>
    <dialog id="game-over-dialog"><form method="dialog"></form></dialog>`;
}

function findMatchingPair(jewels: Jewel[][]): { first: JewelSelection; second: JewelSelection } {
  for (let row = 0; row < jewels[0].length; row++) {
    for (let otherRow = 0; otherRow < jewels[1].length; otherRow++) {
      if (jewels[0][row].card.id === jewels[1][otherRow].card.id) {
        return { first: { row, col: 0 }, second: { row: otherRow, col: 1 } };
      }
    }
  }
  throw new Error('No matching pair on the board');
}

function findMismatchingPair(jewels: Jewel[][]): { first: JewelSelection; second: JewelSelection } {
  for (let row = 0; row < jewels[0].length; row++) {
    for (let otherRow = 0; otherRow < jewels[1].length; otherRow++) {
      if (
        jewels[0][row].groupId === jewels[1][otherRow].groupId
        && jewels[0][row].card.id !== jewels[1][otherRow].card.id
      ) {
        return { first: { row, col: 0 }, second: { row: otherRow, col: 1 } };
      }
    }
  }
  throw new Error('No mismatching pair on the board');
}

function selectedTiles(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.tile.selected'));
}

describe('tile selection', () => {
  it('does not leave a selection border on an unrelated tile after a match', () => {
    const { first, second } = findMatchingPair(board.getJewels());

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    expect(board.getSelectedJewel()).toBeNull();
    expect(selectedTiles()).toHaveLength(0);
  });

  it('clears the selection before announcing a match', () => {
    const selectionDuringChange: (JewelSelection | null)[] = [];
    events.bind('boardChanged', eventData => {
      const data = eventData as { reason: string };
      if (data.reason === 'match') {
        selectionDuringChange.push(board.getSelectedJewel());
      }
    });
    const { first, second } = findMatchingPair(board.getJewels());

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    expect(selectionDuringChange).toEqual([null]);
  });

  it('does not leave a selection border on an unrelated tile after a mismatch', () => {
    const { first, second } = findMismatchingPair(board.getJewels());

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    expect(board.getSelectedJewel()).toBeNull();
    expect(selectedTiles()).toHaveLength(0);
  });

  it('clears the selection before announcing a mismatch', () => {
    const selectionDuringChange: (JewelSelection | null)[] = [];
    events.bind('boardChanged', eventData => {
      const data = eventData as { reason: string };
      if (data.reason === 'mismatch') {
        selectionDuringChange.push(board.getSelectedJewel());
      }
    });
    const { first, second } = findMismatchingPair(board.getJewels());

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    expect(selectionDuringChange).toEqual([null]);
  });

  it('keeps a genuine selection while a new group drops in', () => {
    vi.useFakeTimers();
    game.startGame();
    board.selectJewel(0, 0);

    vi.advanceTimersByTime(INITIAL_INTERVAL + 1);

    const selected = board.getSelectedJewel();
    expect(selected).not.toBeNull();
    const selectedTile = document.querySelector<HTMLButtonElement>(
      `.tile[data-row="${selected!.row}"][data-col="${selected!.col}"]`,
    );
    expect(selectedTile?.classList.contains('selected')).toBe(true);
    vi.useRealTimers();
  });

  it('accepts a click on an existing tile while a new group is dropping in', () => {
    vi.useFakeTimers();
    reducedMotion = false;
    game.startGame();
    vi.advanceTimersByTime(INITIAL_INTERVAL);
    expect(document.querySelectorAll('.tile.is-new').length).toBeGreaterThan(0);

    board.selectJewel(0, 0);

    expect(board.getSelectedJewel()).toEqual({ row: 0, col: 0 });
    vi.useRealTimers();
  });

  it('keeps incoming tiles inert until their drop finishes', () => {
    vi.useFakeTimers();
    reducedMotion = false;
    game.startGame();
    vi.advanceTimersByTime(INITIAL_INTERVAL);

    const dropping = document.querySelector<HTMLButtonElement>('.tile.is-new');
    expect(dropping?.disabled).toBe(true);

    vi.advanceTimersByTime(TILE_DROP_TIME);
    expect(dropping?.disabled).toBe(false);
    vi.useRealTimers();
  });

  it('registers a real click on an existing tile while a new group drops in', async () => {
    vi.useFakeTimers();
    reducedMotion = false;
    const input = (await import('../src/input')).default;
    input.initialize();
    input.bind('selectJewel', game.selectJewel);
    game.startGame();
    vi.advanceTimersByTime(INITIAL_INTERVAL);

    const existing = document.querySelector<HTMLButtonElement>(
      '.tile:not(.is-new)[data-row="0"][data-col="0"]',
    );
    expect(existing).not.toBeNull();
    existing!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(board.getSelectedJewel()).toEqual({ row: 0, col: 0 });
    vi.useRealTimers();
  });
});
