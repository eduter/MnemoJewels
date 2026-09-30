import gameScreen from './screen.game';
import deckStatsScreen from './screen.deck-stats';
import topScoresScreen from './screen.top-scores';
import settingsScreen from './screen.settings';
import board from './board';
import pause from './pause';
import events from './events';
import {
  GAME_SCREEN,
  MENU_SCREEN,
  getScreenFromState,
  historyState,
  resolveBackNavigation,
} from './backNavigation';
import type { ScreenModule } from './types';

const screens: Record<string, ScreenModule> = {
  game: gameScreen,
  'deck-stats': deckStatsScreen,
  'top-scores': topScoresScreen,
  settings: settingsScreen,
};

const screenIds = new Set<string>([MENU_SCREEN, 'about', ...Object.keys(screens)]);

let currentScreen: string | null = null;

(function setup() {
  initializeScreenModules();
  registerListeners();
  registerHistoryListener();
  events.bind('gameOverDialogClosed', eventData => {
    const data = eventData as { action: string };
    if (data.action === 'replay') {
      screens.game.update?.();
    } else {
      returnToMenu();
    }
  });
})();

function initializeScreenModules(): void {
  Object.keys(screens).forEach(function (screenId) {
    if (typeof screens[screenId].setup === 'function') {
      screens[screenId].setup!();
    }
  });
}

function registerListeners(): void {
  document.body.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const navButton = target.closest('button.nav');
    if (navButton instanceof HTMLButtonElement) {
      // A nav button can ask to consume the current entry instead of stacking on
      // top of it (e.g. leaving the first-visit deck picker for the menu).
      navigateTo(navButton.name, { replace: navButton.dataset.history === 'replace' });
      return;
    }
    const backButton = target.closest('button.back');
    if (backButton) {
      back();
    }
  });
}

/**
 * The browser is the source of truth for navigation: every screen is a history
 * entry, so the hardware/Back button, the in-app Back buttons and forward
 * navigation all funnel through `popstate`.
 */
function registerHistoryListener(): void {
  window.addEventListener('popstate', event => {
    if (getScreenFromState(event.state) === GAME_SCREEN && currentScreen === GAME_SCREEN) {
      // Landing on the game entry while the game is on screen is a no-op: this
      // is either our own re-anchor or a Forward press into the game. Reacting
      // would re-open the pause dialog or restart the run.
      return;
    }

    if (gameOverIsOpen()) {
      // Back while the run summary is up takes the same path as its "Main menu"
      // button; closing it emits the event that consumes the game history entry.
      const dialog = document.getElementById('game-over-dialog') as HTMLDialogElement;
      dialog.returnValue = 'menu';
      dialog.close();
      return;
    }

    if (pause.isOpen()) {
      // Back while paused dismisses the dialog and resumes the run. The pop
      // landed on the entry below the game; re-anchor on the game so repeated
      // Back presses toggle the pause instead of walking out of the app. The
      // dialog's close handler resumes the board.
      reanchorGame();
      pause.dismiss();
      return;
    }

    const decision = resolveBackNavigation(event.state, currentScreen, screenIds);

    if (decision.action === 'menu') {
      // The entry below the app's own history (the initial document). Fold it
      // into the menu so the address bar and the visible screen stay in sync.
      history.replaceState(historyState(MENU_SCREEN), '', `#${MENU_SCREEN}`);
      activate(MENU_SCREEN, currentScreen === MENU_SCREEN);
    } else if (decision.action === 'interrupt') {
      interruptGame();
    } else {
      activate(decision.screen, currentScreen === decision.screen);
    }
  });
}

function navigateTo(screenId: string, options: { replace?: boolean } = {}): void {
  if (screenId === currentScreen) {
    throw Error(`Cannot navigate to current screen (${screenId})`);
  }
  const url = `#${screenId}`;
  if (options.replace) {
    history.replaceState(historyState(screenId), '', url);
  } else {
    history.pushState(historyState(screenId), '', url);
  }
  activate(screenId);
}

function back(): void {
  history.back();
}

function gameOverIsOpen(): boolean {
  const dialog = document.getElementById('game-over-dialog') as HTMLDialogElement | null;
  return Boolean(dialog?.open);
}

/**
 * Re-anchors history on the game after a pop landed on the entry below it.
 * `history.forward()` is used rather than `pushState`: a pushed entry made
 * without a user activation is treated as a skippable history-manipulation
 * entry and the Back gesture skips straight past it (the mobile failure), while
 * a forward/back navigation the browser performs itself is never skipped.
 */
function reanchorGame(): void {
  history.forward();
}

/**
 * A Back press from the game parks the run and asks whether to resume or quit.
 * The game stays on screen behind the dialog, so resuming just un-pauses the
 * board: nothing is re-initialized and no new run is started.
 */
function interruptGame(): void {
  if (pause.isOpen()) {
    return;
  }
  // The Back press moved the active entry to the entry below the game; re-anchor
  // on the game so the pause dialog overlays it and the address bar matches.
  reanchorGame();
  board.pauseGame();
  pause.open().then(action => {
    if (action === 'resume') {
      board.resumeGame();
    } else {
      board.abandon();
      returnToMenu();
    }
  });
}

/**
 * Shows the menu and consumes the current entry, so a screen the player chose to
 * leave does not linger in history and require an extra Back press.
 */
function returnToMenu(): void {
  currentScreen = MENU_SCREEN;
  activate(MENU_SCREEN);
  history.back();
}

function activate(screenId: string, skipUpdate = false): void {
  document.querySelectorAll<HTMLElement>('.screen.active').forEach(screen => {
    if (screen.id !== screenId) {
      screen.classList.remove('active');
    }
  });
  currentScreen = screenId;
  if (!skipUpdate && typeof screens[screenId]?.update === 'function') {
    screens[screenId].update!();
  }
  getScreen(screenId).classList.add('active');
}

function getScreen(screenId: string): HTMLElement {
  return document.getElementById(screenId)!;
}

export default {
  navigateTo,
};
