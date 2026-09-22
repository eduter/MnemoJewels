import { NUM_ROWS } from './constants';
import events from './events';
import board from './board';
import score from './score';
import game from './game';
import time from './time';
import { getGameOverAction } from './gameOver';
import TimeMeter from './TimeMeter';
import type { GameOverEventData, JewelSelection } from './types';
import type Jewel from './Jewel';

let foBoard: HTMLTableElement | null = null;
let stats: HTMLElement | null = null;
let redrawIntervalId: ReturnType<typeof setInterval> | undefined;
let ignoreDialogClose = false;

(function setup() {
  events.bind('scoreUp', function (eventData) {
    console.log('Score Up ' + JSON.stringify(eventData));
  });
  events.bind('levelUp', function (eventData) {
    console.log('Level Up ' + JSON.stringify(eventData));
  });

  events.bind('gameStart', onGameStart);
  events.bind('gameOver', onGameOver);

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

function getStatsElem(): HTMLElement {
  if (stats == null) {
    stats = document.getElementById('stats')!;
  }
  return stats;
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
  getStatsElem().innerHTML = 'SCORE: ' + score.getScore() + '<br>' + game.getStats();
  TimeMeter.stop('D');
}

export default {
  redraw,
};
