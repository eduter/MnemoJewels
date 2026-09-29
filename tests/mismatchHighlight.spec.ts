// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { MISMATCH_PENALTY_TIME } from '../src/constants';
import type { CardDto, Deck, JewelSelection } from '../src/types';
import type Jewel from '../src/Jewel';

const CARD_COUNT = 300;

let board: typeof import('../src/board').default;
let game: typeof import('../src/game').default;
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
  const input = (await import('../src/input')).default;
  const storage = (await import('../src/storage')).default;
  await storage.setup();
  await import('../src/display');
  input.initialize();
  input.bind('selectJewel', game.selectJewel);
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

function tileAt(row: number, col: number): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(
    `.tile[data-row="${row}"][data-col="${col}"]`,
  )!;
}

function highlighted(kind: 'is-wrong' | 'is-right'): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(`#board .tile.${kind}`));
}

describe('mismatch feedback', () => {
  it('spotlights exactly the two wrong tiles and the one correct translation', () => {
    const jewels = board.getJewels();
    const { first, second } = findMismatchingPair(jewels);
    const wordCardId = jewels[first.col][first.row].card.id;

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    // The freeze keeps the group on the board, so the highlighted tiles remain
    // present for the player to read.
    expect(highlighted('is-wrong')).toHaveLength(2);
    expect(highlighted('is-right')).toHaveLength(1);

    const correct = highlighted('is-right')[0];
    expect(correct.dataset.cardId).toBe(String(wordCardId));
    expect(correct.dataset.col).toBe('1');
  });

  it('marks the picked word and the picked translation as wrong', () => {
    const jewels = board.getJewels();
    const { first, second } = findMismatchingPair(jewels);

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    expect(tileAt(first.row, first.col).classList.contains('is-wrong')).toBe(true);
    expect(tileAt(second.row, second.col).classList.contains('is-wrong')).toBe(true);
  });

  it('adds a check/cross badge to each highlighted tile', () => {
    const jewels = board.getJewels();
    const { first, second } = findMismatchingPair(jewels);

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    expect(highlighted('is-wrong')[0].querySelector('.tile-verdict.wrong')?.textContent).toBe('\u2717');
    expect(highlighted('is-right')[0].querySelector('.tile-verdict.correct')?.textContent).toBe('\u2713');
  });

  it('clears the spotlight and replaces the group when the penalty ends', () => {
    vi.useFakeTimers();
    game.startGame();
    const jewels = board.getJewels();
    const { first, second } = findMismatchingPair(jewels);

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);
    expect(highlighted('is-wrong')).toHaveLength(2);

    vi.advanceTimersByTime(MISMATCH_PENALTY_TIME + 1);

    expect(document.querySelectorAll('.tile.is-wrong, .tile.is-right')).toHaveLength(0);
    expect(document.getElementById('board')!.classList.contains('is-mismatch-highlight')).toBe(false);
    vi.useRealTimers();
  });

  it('refuses taps while the mismatch freeze is showing', () => {
    vi.useFakeTimers();
    game.startGame();
    const jewels = board.getJewels();
    const { first, second } = findMismatchingPair(jewels);

    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    // Tapping a spotlit tile must not count as a fresh selection.
    board.selectJewel(first.row, first.col);
    expect(board.getSelectedJewel()).toBeNull();

    vi.advanceTimersByTime(MISMATCH_PENALTY_TIME + 1);
    board.selectJewel(first.row, first.col);
    expect(board.getSelectedJewel()).toEqual({ row: first.row, col: first.col });
    vi.useRealTimers();
  });
});
