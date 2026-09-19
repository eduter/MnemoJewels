import { NUM_ROWS } from './constants';
import type { JewelSelection } from './types';

type InputAction = 'selectJewel';
type InputHandler = (row: number, col: number) => void;

const controls: Record<string, InputAction> = {
  CLICK: 'selectJewel',
  TOUCH: 'selectJewel',
};

let inputHandlers: Partial<Record<InputAction, InputHandler[]>> | null = null;
let fmLastStart: JewelSelection | null = null;

function initialize(): void {
  const board = document.getElementById('board')!;

  inputHandlers = {};

  board.addEventListener('mousedown', function (event) {
    handleClick(event, 'CLICK', true);
  });
  board.addEventListener('mouseup', function (event) {
    handleClick(event, 'CLICK', false);
  });
}

function bind(action: InputAction, handler: InputHandler): void {
  if (!inputHandlers) {
    inputHandlers = {};
  }
  if (!inputHandlers[action]) {
    inputHandlers[action] = [];
  }
  inputHandlers[action]!.push(handler);
}

function trigger(action: InputAction, row: number, col: number): void {
  const handlers = inputHandlers?.[action];

  if (handlers) {
    for (let i = 0; i < handlers.length; i++) {
      handlers[i](row, col);
    }
  }
}

function handleClick(event: MouseEvent, control: keyof typeof controls, pbStart: boolean): void {
  const action = controls[control];
  if (!action) {
    return;
  }

  const moTarget = event.target as HTMLTableCellElement;
  const miCol = moTarget.cellIndex;
  const miRow = NUM_ROWS - (moTarget.parentElement as HTMLTableRowElement).rowIndex - 1;

  if (pbStart) {
    fmLastStart = { row: miRow, col: miCol };
  } else if (fmLastStart && fmLastStart.row === miRow && fmLastStart.col === miCol) {
    return;
  }

  trigger(action, miRow, miCol);
  event.preventDefault();
}

export default {
  initialize,
  bind,
};
