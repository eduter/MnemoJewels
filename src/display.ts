import { MATCH_FADE_TIME, TILE_DROP_TIME } from './constants';
import animationState from './animationState';
import events from './events';
import board from './board';
import score from './score';
import game from './game';
import navigation from './navigation';
import type {
  BoardChangedEventData,
  BoardChangeReason,
  GameOverEventData,
  SpawnScheduledEventData,
} from './types';
import type Jewel from './Jewel';

const timers = new Set<ReturnType<typeof setTimeout>>();
let renderGeneration = 0;
let progressGeneration = 0;

(function setup() {
  events.bind('gameStart', onGameStart);
  events.bind('gameOver', onGameOver);
  events.bind('boardChanged', eventData => {
    const data = eventData as BoardChangedEventData;
    renderBoard(data.reason);
    updateHud();
  });
  events.bind('scoreUp', updateHud);
  events.bind('levelUp', updateHud);
  events.bind('spawnScheduled', eventData => {
    startProgress(eventData as SpawnScheduledEventData);
  });

  getGameOverDialog().addEventListener('close', () => {
    if (getGameOverDialog().returnValue === 'replay') {
      game.startGame();
    } else {
      navigation.navigateTo('main-menu');
    }
  });
})();

function onGameStart(): void {
  clearPendingAnimations();
  const dialog = getGameOverDialog();
  if (dialog.open) {
    dialog.close();
  }
  renderBoard('reset');
  updateHud();
}

function onGameOver(eventData: unknown): void {
  stopProgress();
  const data = eventData as GameOverEventData;
  setText('result-score', data.score.toLocaleString());
  setText('result-duration', formatDuration(data.gameEnd - data.gameStart));
  setText('result-level', String(data.level));
  const dialog = getGameOverDialog();
  dialog.returnValue = '';
  dialog.showModal();
}

function renderBoard(reason: BoardChangeReason): void {
  const boardElement = document.getElementById('board')!;
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
    currentTiles.forEach(tile => { tile.disabled = true; });
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
      if (isNew) {
        tile.classList.add('is-new');
        tile.style.setProperty('--drop-order', String(jewels[col].length - row));
        boardElement.appendChild(tile);
        requestAnimationFrame(() => {
          if (generation === renderGeneration) {
            tile!.classList.remove('is-new');
          }
        });
      }
      if (reason === 'match' && currentTiles.has(key)) {
        schedule(() => updateTilePosition(tile!, row, col), MATCH_FADE_TIME);
      } else {
        updateTilePosition(tile, row, col);
      }
    }
  }

  currentTiles.forEach((tile, key) => {
    if (!incomingKeys.has(key)) {
      tile.disabled = true;
      tile.classList.add(reason === 'match' ? 'is-matched' : 'is-leaving');
      schedule(() => tile.remove(), MATCH_FADE_TIME);
    }
  });

  if (reason === 'mismatch') {
    boardElement.classList.remove('is-mismatch');
    void boardElement.offsetWidth;
    boardElement.classList.add('is-mismatch');
    showFeedback('Not quite — take another look');
  }

  if (transitionId !== null) {
    schedule(() => {
      animationState.complete(transitionId);
      if (animationState.isInteractive()) {
        boardElement.removeAttribute('aria-busy');
        boardElement.querySelectorAll<HTMLButtonElement>('.tile').forEach(tile => {
          tile.disabled = false;
        });
      }
    }, transitionDuration);
  }
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
  tile.disabled = true;
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
  tile.textContent = jewel.getText();
  tile.className = `tile group${jewel.groupId}`;
  tile.classList.toggle('selected', selected);
  tile.setAttribute('aria-selected', String(selected));
  tile.setAttribute(
    'aria-label',
    `${col === 0 ? 'Word' : 'Translation'}: ${jewel.getText()}`,
  );
}

function updateTilePosition(tile: HTMLButtonElement, row: number, col: number): void {
  tile.style.bottom = `${1 + row * 9.8}%`;
  tile.style.left = `${2 + col * 49}%`;
}

function updateHud(): void {
  setText('score-value', score.getScore().toLocaleString());
  setText('level-value', String(game.getLevel()));
}

function startProgress(schedule: SpawnScheduledEventData): void {
  const progress = document.getElementById('spawn-progress')!;
  const fill = progress.querySelector<HTMLElement>('.spawn-progress-fill')!;
  const generation = ++progressGeneration;

  fill.style.transition = 'none';
  fill.style.transform = 'scaleX(0)';
  progress.setAttribute('aria-valuenow', '0');
  progress.setAttribute(
    'aria-valuetext',
    `Next group in ${(schedule.delay / 1000).toFixed(1)} seconds`,
  );
  setText('pace-value', `${(schedule.delay / 1000).toFixed(1)}s`);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (generation !== progressGeneration) {
      return;
    }
    fill.style.transition = `transform ${schedule.delay}ms linear`;
    fill.style.transform = 'scaleX(1)';
    progress.setAttribute('aria-valuenow', '100');
  }));
}

function stopProgress(): void {
  progressGeneration++;
  const fill = document.querySelector<HTMLElement>('.spawn-progress-fill')!;
  fill.style.transition = 'none';
  fill.style.transform = 'scaleX(1)';
}

function showFeedback(message: string): void {
  const feedback = document.getElementById('feedback')!;
  feedback.textContent = message;
  feedback.classList.add('visible');
  schedule(() => feedback.classList.remove('visible'), 1200);
}

function clearPendingAnimations(): void {
  renderGeneration++;
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
  animationState.reset();
  document.getElementById('board')!.replaceChildren();
  document.getElementById('feedback')!.className = '';
}

function schedule(callback: () => void, delay: number): void {
  const timer = setTimeout(() => {
    timers.delete(timer);
    callback();
  }, delay);
  timers.add(timer);
}

function getTransitionDuration(reason: BoardChangeReason): number {
  if (reason === 'match') {
    return MATCH_FADE_TIME + TILE_DROP_TIME;
  }
  if (reason === 'reset' || reason === 'spawn' || reason === 'mismatch') {
    return TILE_DROP_TIME;
  }
  return 0;
}

function getJewelKey(jewel: Jewel, col: number): string {
  return `${jewel.card.id}:${col}`;
}

function getGameOverDialog(): HTMLDialogElement {
  return document.getElementById('game-over-dialog') as HTMLDialogElement;
}

function setText(id: string, value: string): void {
  document.getElementById(id)!.textContent = value;
}

function formatDuration(duration: number): string {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
