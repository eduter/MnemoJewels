import { NUM_ROWS } from './constants';

type InputAction = 'selectJewel';
type InputHandler = (row: number, col: number) => void;

// A tap that drags further than this is treated as a scroll/drag, not a select.
// Browsers suppress the click once a touch moves past their own (smaller) slop,
// so this has to be comfortably larger than that to catch hurried, drifting taps.
const TAP_SLOP = 16;

const inputHandlers: Partial<Record<InputAction, InputHandler[]>> = {};
let initialized = false;
let tap: { id: number; x: number; y: number; target: EventTarget | null } | null = null;

function initialize(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  const boardArea = document.getElementById('board-area')!;

  // Taps are resolved from pointer events rather than `click`. A hurried tap
  // drifts a few pixels, which fires `touchmove`; `additional.ts` calls
  // `preventDefault()` on every `touchmove` to kill overscroll, and that also
  // suppresses the synthesized `click`, so a click-only board silently missed
  // those taps. Pointer events fire regardless, and the displacement between
  // down and up is enough to tell a tap from a drag.
  boardArea.addEventListener('pointerdown', event => {
    // Clear first: a gesture that ended off-board may never have reached
    // `pointerup`/`pointercancel` here, and a stale tap must not select later.
    tap = null;
    if (!event.isPrimary || event.button !== 0) {
      return;
    }
    const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('.tile');
    if (tile?.disabled) {
      return;
    }
    tap = { id: event.pointerId, x: event.clientX, y: event.clientY, target: event.target };
  });

  boardArea.addEventListener('pointerup', event => {
    if (tap === null || event.pointerId !== tap.id) {
      return;
    }
    const { x, y, target } = tap;
    tap = null;
    if (Math.hypot(event.clientX - x, event.clientY - y) > TAP_SLOP) {
      return;
    }
    select(target as HTMLElement);
  });

  boardArea.addEventListener('pointercancel', () => {
    tap = null;
  });

  // A `click` whose detail is 0 has no pointer origin: it is a keyboard
  // activation (Enter/Space on a focused tile) or a screen-reader activation,
  // which pointer events do not cover. Pointer taps arrive with detail >= 1 and
  // are handled above, so this does not double-select.
  boardArea.addEventListener('click', event => {
    if (event.detail !== 0) {
      return;
    }
    select(event.target as HTMLElement);
  });

  boardArea.addEventListener('keydown', event => {
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

function select(target: HTMLElement): void {
  const tile = target.closest<HTMLButtonElement>('.tile');
  if (tile) {
    if (tile.disabled) {
      return;
    }
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    if (Number.isInteger(row) && Number.isInteger(col)) {
      trigger('selectJewel', row, col);
    }
    return;
  }

  const cell = target.closest('td');
  if (cell && cell.parentElement) {
    const miCol = cell.cellIndex;
    const miRow = NUM_ROWS - (cell.parentElement as HTMLTableRowElement).rowIndex - 1;
    trigger('selectJewel', miRow, miCol);
  }
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
