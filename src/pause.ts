import { getPauseAction } from './gameOver';
import type { PauseAction } from './gameOver';

const DIALOG_ID = 'pause-dialog';

function isOpen(): boolean {
  return getDialog().open;
}

function open(): Promise<PauseAction> {
  const dialog = getDialog();
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => {
    dialog.addEventListener(
      'close',
      () => resolve(getPauseAction(dialog.returnValue)),
      { once: true },
    );
  });
}

function getDialog(): HTMLDialogElement {
  return document.getElementById(DIALOG_ID) as HTMLDialogElement;
}

/**
 * Closes the dialog from the outside (a Back press) with an empty return value,
 * which resolves as "resume" — Back dismisses the pause and the run continues.
 */
function dismiss(): void {
  const dialog = getDialog();
  if (!dialog.open) {
    return;
  }
  dialog.returnValue = '';
  dialog.close();
}

export default {
  isOpen,
  open,
  dismiss,
};
