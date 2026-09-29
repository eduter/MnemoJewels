// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_INTERVAL } from '../src/constants';
import type { CardDto, Deck, JewelSelection } from '../src/types';
import type Jewel from '../src/Jewel';

const CARD_COUNT = 300;

let board: typeof import('../src/board').default;
let game: typeof import('../src/game').default;
let score: typeof import('../src/score').default;

beforeAll(async () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: true,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  window.requestAnimationFrame = callback => window.setTimeout(() => callback(0), 0);
  // jsdom does not implement <dialog> modal behavior.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };

  seedStorage();
  installDom();

  board = (await import('../src/board')).default;
  game = (await import('../src/game')).default;
  score = (await import('../src/score')).default;
  const storage = (await import('../src/storage')).default;
  await storage.setup();
  await import('../src/display');
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.removeItem('mj.topScores');
  game.startGame();
  vi.advanceTimersByTime(INITIAL_INTERVAL);
});

afterEach(() => {
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
    <dialog id="game-over-dialog"><form method="dialog"></form></dialog>
    <span id="result-score"></span>
    <span id="result-duration"></span>
    <span id="result-level"></span>`;
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

function readTopScores(): Array<{ points: number }> {
  return score.getTopScores() as Array<{ points: number }>;
}

describe('top scores', () => {
  it('does not record a completed run that scored nothing', () => {
    const before = readTopScores().length;

    game.gameOver();

    expect(readTopScores()).toHaveLength(before);
  });

  it('records a completed run that scored', () => {
    const before = readTopScores().length;
    const { first, second } = findMatchingPair(board.getJewels());
    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    game.gameOver();

    const topScores = readTopScores();
    expect(topScores).toHaveLength(before + 1);
    expect(topScores[0].points).toBeGreaterThan(0);
  });

  it('records a quit when the run had scored', () => {
    const before = readTopScores().length;
    const { first, second } = findMatchingPair(board.getJewels());
    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);
    const earned = score.getScore();
    expect(earned).toBeGreaterThan(0);

    board.abandon();

    const topScores = readTopScores();
    expect(topScores).toHaveLength(before + 1);
    expect(topScores[0].points).toBe(earned);
  });

  it('does not record a quit that scored nothing', () => {
    const before = readTopScores().length;

    board.abandon();

    expect(readTopScores()).toHaveLength(before);
  });

  it('does not open the run summary when the player quits', () => {
    const dialog = document.getElementById('game-over-dialog') as HTMLDialogElement;
    const { first, second } = findMatchingPair(board.getJewels());
    board.selectJewel(first.row, first.col);
    board.selectJewel(second.row, second.col);

    board.abandon();

    expect(dialog.open).toBe(false);
  });
});
