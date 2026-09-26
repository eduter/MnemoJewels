import animationState from './animationState';
import { NUM_ROWS } from './constants';

type InputAction = 'selectJewel';
type InputHandler = (row: number, col: number) => void;

const inputHandlers: Partial<Record<InputAction, InputHandler[]>> = {};
let initialized = false;

function initialize(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  const boardArea = document.getElementById('board-area')!;
  boardArea.addEventListener('click', event => {
    if (!animationState.isInteractive()) {
      return;
    }

    const target = event.target as HTMLElement;
    const tile = target.closest<HTMLButtonElement>('.tile');
    if (tile) {
      if (tile.disabled) {
        return;
      }
      const row = Number(tile.dataset.row);
      const col = Number(tile.dataset.col);
      if (Number.isInteger(row) && Number.isInteger(col)) {
        trigger('selectJewel', row, col);
        event.preventDefault();
      }
      return;
    }

    const cell = target.closest('td');
    if (cell && cell.parentElement) {
      const miCol = cell.cellIndex;
      const miRow = NUM_ROWS - (cell.parentElement as HTMLTableRowElement).rowIndex - 1;
      trigger('selectJewel', miRow, miCol);
      event.preventDefault();
    }
  });

  boardArea.addEventListener('keydown', event => {
    if (!animationState.isInteractive()) {
      return;
    }
    const current = (event.target as HTMLElement).closest<HTMLButtonElement>('.tile');
    if (!current) {
      return;
    }
    const row = Number(current.dataset.row);
    const col = Number(current.dataset.col);
    let nextRow = row;
    let nextCol = col;
    if (event.key === 'ArrowUp') {
      nextRow += 1;
    } else if (event.key === 'ArrowDown') {
      nextRow -= 1;
    } else if (event.key === 'ArrowLeft') {
      nextCol -= 1;
    } else if (event.key === 'ArrowRight') {
      nextCol += 1;
    } else {
      return;
    }
    const next = boardArea.querySelector<HTMLButtonElement>(
      `.tile[data-row="${nextRow}"][data-col="${nextCol}"]`,
    );
    if (next && !next.disabled) {
      next.focus();
      event.preventDefault();
    }
  });
}

function bind(action: InputAction, handler: InputHandler): void {
  if (!inputHandlers[action]) {
    inputHandlers[action] = [];
  }
  inputHandlers[action]!.push(handler);
}

function trigger(action: InputAction, row: number, col: number): void {
  const handlers = inputHandlers[action];
  if (handlers) {
    for (let i = 0; i < handlers.length; i++) {
      handlers[i](row, col);
    }
  }
}

export default {
  initialize,
  bind,
};
