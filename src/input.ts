import animationState from './animationState';

type InputAction = 'selectJewel';
type InputHandler = (row: number, col: number) => void;

const inputHandlers: Partial<Record<InputAction, InputHandler[]>> = {};
let initialized = false;

function initialize(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  document.getElementById('board')!.addEventListener('click', event => {
    const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('.tile');
    if (!tile || tile.disabled || !animationState.isInteractive()) {
      return;
    }
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    if (Number.isInteger(row) && Number.isInteger(col)) {
      trigger('selectJewel', row, col);
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
