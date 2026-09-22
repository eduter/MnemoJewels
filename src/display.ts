import { NUM_ROWS } from './constants';
import events from './events';
import board from './board';
import score from './score';
import game from './game';
import time from './time';
import { getGameOverAction } from './gameOver';
import TimeMeter from './TimeMeter';
import type { GameOverEventData, JewelSelection, SpawnScheduledEventData } from './types';
import type Jewel from './Jewel';

let foBoard: HTMLTableElement | null = null;
let redrawIntervalId: ReturnType<typeof setInterval> | undefined;
let ignoreDialogClose = false;
let progressGeneration = 0;

(function setup() {
  events.bind('scoreUp', function (eventData) {
    console.log('Score Up ' + JSON.stringify(eventData));
  });
  events.bind('levelUp', function (eventData) {
    console.log('Level Up ' + JSON.stringify(eventData));
  });

  events.bind('gameStart', onGameStart);
  events.bind('gameOver', onGameOver);
  events.bind('spawnScheduled', eventData => {
    startProgress(eventData as SpawnScheduledEventData);
  });

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
  clearInterval(redrawIntervalId);
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
  redraw(board.getJewels(), board.getSelectedJewel());
  setText('result-score', String(data.score));
  setText('result-duration', time.formatDuration(data.gameEnd - data.gameStart, 2));
  setText('result-level', String(data.level));
  const dialog = getGameOverDialog();
  dialog.returnValue = '';
  dialog.showModal();
}

function getBoardElem(): HTMLTableElement {
  if (foBoard == null) {
    foBoard = document.getElementById('board') as HTMLTableElement;
  }
  return foBoard;
}

function getGameOverDialog(): HTMLDialogElement {
  return document.getElementById('game-over-dialog') as HTMLDialogElement;
}

function setText(id: string, value: string): void {
  document.getElementById(id)!.textContent = value;
}

function redraw(paJewels: Jewel[][], pmSelectedJewel: JewelSelection | null): void {
  TimeMeter.start('D');
  const moBoard = getBoardElem();
  let i: number;
  let j: number;
  let moCell: HTMLTableCellElement;

  for (i = 0; i < NUM_ROWS; i++) {
    for (j = 0; j < 2; j++) {
      moCell = moBoard.rows[i].cells[j];
      moCell.className = '';
      moCell.innerHTML = '';
    }
  }
  for (j = 0; j < paJewels.length; j++) {
    for (i = 0; i < paJewels[0].length; i++) {
      const moJewel = paJewels[j][i];
      moCell = moBoard.rows[NUM_ROWS - i - 1].cells[j];
      moCell.className = 'group' + moJewel.groupId;
      moCell.innerHTML = moJewel.getText();
      if (pmSelectedJewel && pmSelectedJewel.row === i && pmSelectedJewel.col === j) {
        moCell.className += ' selected';
      }
    }
  }
  updateHud();
  TimeMeter.stop('D');
}

function updateHud(): void {
  setText('score-value', String(score.getScore()));
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

  const startFill = () => {
    if (generation !== progressGeneration) {
      return;
    }
    fill.style.transition = `transform ${schedule.delay}ms linear`;
    fill.style.transform = 'scaleX(1)';
    progress.setAttribute('aria-valuenow', '100');
  };

  if (schedule.delay <= 0) {
    fill.style.transform = 'scaleX(1)';
    progress.setAttribute('aria-valuenow', '100');
    return;
  }

  requestAnimationFrame(() => requestAnimationFrame(startFill));
}

function stopProgress(): void {
  progressGeneration++;
  const fill = document.querySelector<HTMLElement>('.spawn-progress-fill');
  if (!fill) {
    return;
  }
  fill.style.transition = 'none';
}

export default {
  redraw,
};
