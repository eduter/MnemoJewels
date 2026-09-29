import { MATCH_FADE_TIME, MISMATCH_PENALTY_TIME, TILE_DROP_TIME } from './constants';
import animationState from './animationState';
import events from './events';
import board from './board';
import score from './score';
import game from './game';
import time from './time';
import { getSpawnProgress } from './utils';
import { getGameOverAction } from './gameOver';
import type {
  BoardChangedEventData,
  BoardChangeReason,
  GameOverEventData,
  MismatchHighlight,
  SpawnScheduledEventData,
} from './types';
import type Jewel from './Jewel';

const timers = new Set<ReturnType<typeof setTimeout>>();
const MIN_TILE_LABEL_SCALE = 0.55;
let renderGeneration = 0;
let progressGeneration = 0;
let ignoreDialogClose = false;

(function setup() {
  events.bind('gameStart', onGameStart);
  events.bind('gameOver', onGameOver);
  events.bind('boardChanged', eventData => {
    const data = eventData as BoardChangedEventData;
    renderBoard(data.reason, data.highlight);
    updateHud();
  });
  events.bind('scoreUp', updateHud);
  events.bind('levelUp', updateHud);
  events.bind('spawnScheduled', eventData => {
    startProgress(eventData as SpawnScheduledEventData);
  });
  events.bind('spawningPaused', freezeProgress);
  window.addEventListener('resize', fitAllTileLabels);

  getGameOverDialog().addEventListener('close', () => {
    if (ignoreDialogClose) {
      return;
    }
    events.trigger('gameOverDialogClosed', {
      action: getGameOverAction(getGameOverDialog().returnValue),
    });
  });
})();

function onGameStart(): void {
  const dialog = getGameOverDialog();
  if (dialog.open) {
    ignoreDialogClose = true;
    dialog.close();
    ignoreDialogClose = false;
  }
  clearPendingAnimations();
  renderBoard('reset');
  updateHud();
}

function onGameOver(eventData: unknown): void {
  stopProgress();
  const data = eventData as GameOverEventData;
  // An abandoned run has no summary to show; the caller navigates straight back
  // to the menu, so leave the dialog closed.
  if (data.abandoned) {
    return;
  }
  setText('result-score', String(data.score));
  setText('result-duration', time.formatDuration(data.gameEnd - data.gameStart, 2));
  setText('result-level', String(data.level));
  const dialog = getGameOverDialog();
  dialog.returnValue = '';
  dialog.showModal();
}

function renderBoard(reason: BoardChangeReason, highlight?: MismatchHighlight): void {
  const boardElement = getBoardElem();
  const jewels = board.getJewels();
  const selected = board.getSelectedJewel();
  const currentTiles = new Map<string, HTMLButtonElement>();
  boardElement.querySelectorAll<HTMLButtonElement>('.tile').forEach(tile => {
    currentTiles.set(tile.dataset.key!, tile);
  });

  const incomingKeys = new Set<string>();
  const transitionDuration = getTransitionDuration(reason);
  const transitionId = transitionDuration > 0 ? animationState.begin() : null;
  const generation = renderGeneration;

  if (transitionId !== null) {
    boardElement.setAttribute('aria-busy', 'true');
  }

  for (let col = 0; col < jewels.length; col++) {
    for (let row = 0; row < jewels[col].length; row++) {
      const jewel = jewels[col][row];
      const key = getJewelKey(jewel, col);
      incomingKeys.add(key);
      let tile = currentTiles.get(key);
      const isNew = !tile;

      if (!tile) {
        tile = createTile(jewel, row, col, key);
      }

      updateTile(tile, jewel, row, col, selected?.row === row && selected.col === col);
      applyHighlight(tile, jewel, col, highlight);

      if (isNew) {
        if (transitionDuration > 0) {
          tile.classList.add('is-new');
        }
        boardElement.appendChild(tile);
        if (transitionDuration > 0) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (generation === renderGeneration) {
                tile!.classList.remove('is-new');
              }
            });
          });
        }
      }

      if (reason === 'match' && currentTiles.has(key) && transitionDuration > 0) {
        schedule(() => updateTilePosition(tile!, row, col), MATCH_FADE_TIME);
      } else {
        updateTilePosition(tile, row, col);
      }
    }
  }

  currentTiles.forEach((tile, key) => {
    if (!incomingKeys.has(key)) {
      // A leaving tile keeps its pre-reflow coordinates, so it must not stay
      // clickable; the player interacts with the tiles that fall into the gap.
      tile.disabled = true;
      tile.classList.remove('selected');
      tile.setAttribute('aria-selected', 'false');
      clearHighlight(tile);
      tile.classList.add(reason === 'match' ? 'is-matched' : 'is-leaving');
      schedule(() => tile.remove(), Math.max(MATCH_FADE_TIME, transitionDuration));
    }
  });

  if (transitionId !== null) {
    schedule(() => {
      animationState.complete(transitionId);
      if (animationState.isInteractive()) {
        boardElement.removeAttribute('aria-busy');
      }
    }, transitionDuration);
  }

  setMismatchHighlightActive(Boolean(highlight));
}

function applyHighlight(
  tile: HTMLButtonElement,
  jewel: Jewel,
  col: number,
  highlight?: MismatchHighlight,
): void {
  if (!highlight) {
    clearHighlight(tile);
    return;
  }

  const isWrong = highlight.wrong.some(
    entry => entry.cardId === jewel.card.id && entry.col === col,
  );
  const isCorrect = highlight.correct.some(
    entry => entry.cardId === jewel.card.id && entry.col === col,
  );

  if (isWrong || isCorrect) {
    tile.classList.toggle('is-wrong', isWrong);
    tile.classList.toggle('is-right', isCorrect);
    setVerdict(tile, isWrong ? 'wrong' : 'correct');
  } else {
    clearHighlight(tile);
  }
}

function clearHighlight(tile: HTMLButtonElement): void {
  tile.classList.remove('is-wrong', 'is-right');
  setVerdict(tile, null);
}

function setVerdict(tile: HTMLButtonElement, verdict: 'wrong' | 'correct' | null): void {
  const existing = tile.querySelector<HTMLElement>('.tile-verdict');
  if (verdict === null) {
    existing?.remove();
    return;
  }

  const glyph = verdict === 'wrong' ? '\u2717' : '\u2713';
  const label = verdict === 'wrong' ? 'Wrong match' : 'Correct match';
  if (existing) {
    existing.textContent = glyph;
    existing.setAttribute('aria-label', label);
    return;
  }

  const badge = document.createElement('span');
  badge.className = `tile-verdict ${verdict}`;
  badge.setAttribute('aria-hidden', 'true');
  badge.title = label;
  badge.textContent = glyph;
  tile.appendChild(badge);
}

function setMismatchHighlightActive(active: boolean): void {
  getBoardElem().classList.toggle('is-mismatch-highlight', active);
}

function createTile(
  jewel: Jewel,
  row: number,
  col: number,
  key: string,
): HTMLButtonElement {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'tile';
  tile.dataset.key = key;
  tile.setAttribute('role', 'gridcell');
  const label = document.createElement('span');
  label.className = 'tile-label';
  tile.appendChild(label);
  updateTile(tile, jewel, row, col, false);
  return tile;
}

function updateTile(
  tile: HTMLButtonElement,
  jewel: Jewel,
  row: number,
  col: number,
  selected: boolean,
): void {
  tile.dataset.row = String(row);
  tile.dataset.col = String(col);
  tile.dataset.cardId = String(jewel.card.id);
  const text = jewel.getText();
  const label = tile.querySelector<HTMLElement>('.tile-label')!;
  if (label.textContent !== text) {
    label.textContent = text;
    requestAnimationFrame(() => fitTileLabel(tile));
  }
  tile.title = text;
  tile.className = `tile group${jewel.groupId}`;
  tile.classList.toggle('selected', selected);
  tile.setAttribute('aria-selected', String(selected));
  tile.setAttribute(
    'aria-label',
    `${col === 0 ? 'Word' : 'Translation'}: ${text}`,
  );
}

function fitAllTileLabels(): void {
  getBoardElem().querySelectorAll<HTMLButtonElement>('.tile').forEach(fitTileLabel);
}

function fitTileLabel(tile: HTMLButtonElement): void {
  const label = tile.querySelector<HTMLElement>('.tile-label');
  if (!label || !tile.isConnected) {
    return;
  }

  label.style.fontSize = '1em';
  if (label.scrollWidth <= label.clientWidth + 1) {
    return;
  }

  let lower = MIN_TILE_LABEL_SCALE;
  let upper = 1;
  for (let i = 0; i < 6; i++) {
    const scale = (lower + upper) / 2;
    label.style.fontSize = `${scale}em`;
    if (label.scrollWidth <= label.clientWidth + 1) {
      lower = scale;
    } else {
      upper = scale;
    }
  }
  label.style.fontSize = `${lower}em`;
}

function updateTilePosition(tile: HTMLButtonElement, row: number, col: number): void {
  tile.style.bottom = `${row * 10}%`;
  tile.style.left = `${col * 50}%`;
}

function updateHud(): void {
  setText('score-value', String(score.getScore()));
  setText('level-value', String(game.getLevel()));
}

function startProgress(schedule: SpawnScheduledEventData): void {
  const progress = document.getElementById('spawn-progress')!;
  const fill = progress.querySelector<HTMLElement>('.spawn-progress-fill')!;
  const generation = ++progressGeneration;
  // A resumed schedule reports its original start, so the delay has already
  // partly elapsed; begin the fill there instead of at zero.
  const now = time.now();
  const startFraction = getSpawnProgress(schedule.startedAt, schedule.delay, now);
  const remaining = Math.max(0, schedule.delay - Math.max(0, now - schedule.startedAt));

  fill.style.transition = 'none';
  fill.style.transform = `scaleX(${startFraction})`;
  progress.setAttribute('aria-valuenow', String(Math.round(startFraction * 100)));
  progress.setAttribute(
    'aria-valuetext',
    `Next group in ${(remaining / 1000).toFixed(1)} seconds`,
  );

  const startFill = () => {
    if (generation !== progressGeneration) {
      return;
    }
    fill.style.transition = `transform ${remaining}ms linear`;
    fill.style.transform = 'scaleX(1)';
    progress.setAttribute('aria-valuenow', '100');
  };

  if (remaining <= 0) {
    fill.style.transform = 'scaleX(1)';
    progress.setAttribute('aria-valuenow', '100');
    return;
  }

  requestAnimationFrame(() => requestAnimationFrame(startFill));
}

function stopProgress(): void {
  freezeProgress();
}

// Halt the bar at its current fill so a paused countdown does not run to the end.
// The inline transform overrides the still-running transition; startProgress
// clears it when the schedule resumes.
function freezeProgress(): void {
  progressGeneration++;
  const fill = document.querySelector<HTMLElement>('.spawn-progress-fill');
  if (!fill) {
    return;
  }
  const currentScale = getComputedStyle(fill).transform;
  fill.style.transition = 'none';
  if (currentScale !== '' && currentScale !== 'none') {
    fill.style.transform = currentScale;
  }
}

function clearPendingAnimations(): void {
  renderGeneration++;
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
  animationState.reset();
  getBoardElem().replaceChildren();
}

function schedule(callback: () => void, delay: number): void {
  if (delay <= 0) {
    callback();
    return;
  }
  const timer = setTimeout(() => {
    timers.delete(timer);
    callback();
  }, delay);
  timers.add(timer);
}

function getTransitionDuration(reason: BoardChangeReason): number {
  if (prefersReducedMotion()) {
    return 0;
  }
  if (reason === 'match') {
    return MATCH_FADE_TIME + TILE_DROP_TIME;
  }
  if (reason === 'reset' || reason === 'spawn' || reason === 'mismatch') {
    return TILE_DROP_TIME;
  }
  return 0;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getJewelKey(jewel: Jewel, col: number): string {
  return `${jewel.card.id}:${col}`;
}

function getBoardElem(): HTMLElement {
  return document.getElementById('board')!;
}

function getGameOverDialog(): HTMLDialogElement {
  return document.getElementById('game-over-dialog') as HTMLDialogElement;
}

function setText(id: string, value: string): void {
  document.getElementById(id)!.textContent = value;
}

export default {
  redraw: () => renderBoard('selection'),
};
