import { NUM_ROWS } from './constants';
import events from './events';
import board from './board';
import score from './score';
import game from './game';
import navigation from './navigation';
import { getSpawnProgress } from './spawnProgress';
import type {
  GameOverEventData,
  JewelSelection,
  SpawnScheduledEventData,
} from './types';
import type Jewel from './Jewel';

let foBoard: HTMLTableElement | null = null;
let stats: HTMLElement | null = null;
let redrawIntervalId: ReturnType<typeof setInterval> | undefined;
let progressGeneration = 0;
let progressAnimationFrame: number | null = null;
let closingDialogInternally = false;

(function setup() {
  events.bind('gameStart', onGameStart);
  events.bind('gameOver', onGameOver);
  events.bind('spawnScheduled', eventData => {
    if (eventData) {
      startProgress(eventData as SpawnScheduledEventData);
    } else {
      stopProgress();
    }
  });

  const dialog = getGameOverDialog();
  dialog.addEventListener('close', onDialogClose);
})();

function onGameStart(): void {
  clearInterval(redrawIntervalId);
  closeGameOverDialog();
  redrawIntervalId = setInterval(
    function () {
      redraw(board.getJewels(), board.getSelectedJewel());
    },
    1000 / 6,
  );
}

function onGameOver(eventData: unknown): void {
  clearInterval(redrawIntervalId);
  stopProgress();
  const data = eventData as GameOverEventData;
  setText('result-score', String(data.score));
  setText('result-duration', formatDuration(data.gameEnd - data.gameStart));
  setText('result-level', String(data.level));
  const dialog = getGameOverDialog();
  dialog.returnValue = '';
  dialog.showModal();
}

function onDialogClose(): void {
  if (closingDialogInternally) {
    return;
  }
  if (getGameOverDialog().returnValue === 'replay') {
    game.startGame();
    return;
  }
  if (document.getElementById('game')?.classList.contains('active')) {
    navigation.navigateTo('main-menu');
  }
}

function closeGameOverDialog(): void {
  const dialog = getGameOverDialog();
  if (!dialog.open) {
    return;
  }
  closingDialogInternally = true;
  dialog.close();
  closingDialogInternally = false;
}

function getBoardElem(): HTMLTableElement {
  if (foBoard == null) {
    foBoard = document.getElementById('board') as HTMLTableElement;
  }
  return foBoard;
}

function getStatsElem(): HTMLElement {
  if (stats == null) {
    stats = document.getElementById('stats')!;
  }
  return stats;
}

function redraw(paJewels: Jewel[][], pmSelectedJewel: JewelSelection | null): void {
  const moBoard = getBoardElem();
  let i: number;
  let j: number;
  let moCell: HTMLTableCellElement;

  for (i = 0; i < NUM_ROWS; i++) {
    for (j = 0; j < 2; j++) {
      moCell = moBoard.rows[i].cells[j];
      moCell.className = '';
      moCell.textContent = '';
    }
  }
  for (j = 0; j < paJewels.length; j++) {
    for (i = 0; i < paJewels[0].length; i++) {
      const moJewel = paJewels[j][i];
      moCell = moBoard.rows[NUM_ROWS - i - 1].cells[j];
      moCell.className = 'group' + moJewel.groupId;
      moCell.textContent = moJewel.getText();
      if (pmSelectedJewel && pmSelectedJewel.row === i && pmSelectedJewel.col === j) {
        moCell.className += ' selected';
      }
    }
  }
  getStatsElem().textContent =
    'SCORE: ' + score.getScore() + '    LEVEL: ' + game.getLevel();
}

function startProgress(schedule: SpawnScheduledEventData): void {
  const progress = document.getElementById('spawn-progress');
  const fill = progress?.querySelector<HTMLElement>('.spawn-progress-fill');
  if (!progress || !fill) {
    return;
  }
  const generation = ++progressGeneration;

  fill.style.transition = 'none';
  fill.style.transform = 'scaleX(0)';
  updateProgressText(progress, schedule);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (generation !== progressGeneration) {
      return;
    }
    fill.style.transition = `transform ${schedule.delay}ms linear`;
    fill.style.transform = 'scaleX(1)';
  }));
}

function stopProgress(): void {
  progressGeneration++;
  if (progressAnimationFrame !== null) {
    cancelAnimationFrame(progressAnimationFrame);
    progressAnimationFrame = null;
  }
  const fill = document.querySelector<HTMLElement>('.spawn-progress-fill');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.transform = 'scaleX(0)';
  }
  setText('pace-value', '—');
}

function updateProgressText(
  progress: HTMLElement,
  schedule: SpawnScheduledEventData,
): void {
  const generation = progressGeneration;

  function update(): void {
    if (generation !== progressGeneration) {
      return;
    }
    const state = getSpawnProgress(schedule, Date.now());
    const remainingSeconds = Math.ceil(state.remaining / 100) / 10;
    setText('pace-value', `${remainingSeconds.toFixed(1)}s`);
    progress.setAttribute('aria-valuenow', String(Math.round(state.percent)));
    progress.setAttribute(
      'aria-valuetext',
      state.remaining > 0
        ? `Next group in ${remainingSeconds.toFixed(1)} seconds`
        : 'New group arriving',
    );
    if (state.remaining > 0) {
      progressAnimationFrame = requestAnimationFrame(update);
    }
  }

  if (progressAnimationFrame !== null) {
    cancelAnimationFrame(progressAnimationFrame);
  }
  update();
}

function getGameOverDialog(): HTMLDialogElement {
  return document.getElementById('game-over-dialog') as HTMLDialogElement;
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatDuration(duration: number): string {
  const totalSeconds = Math.max(0, Math.floor(duration / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default {
  redraw,
};
