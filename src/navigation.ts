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
      navigateTo(MENU_SCREEN, { replace: true });
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
      navigateTo(navButton.name);
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
    if (pause.isOpen()) {
      // Let the extra Back press collapse onto the menu instead of navigating
      // the (paused) game screen out from under the dialog.
      history.pushState(historyState(MENU_SCREEN), '', `#${MENU_SCREEN}`);
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

/**
 * A Back press from the game parks the run and asks whether to resume or quit.
 * Nothing on the board changes until the choice is made, so a resume picks the
 * run up exactly where it left off.
 */
function interruptGame(): void {
  if (pause.isOpen()) {
    return;
  }
  board.pauseGame();
  activate(MENU_SCREEN);
  pause.open().then(action => {
    if (action === 'resume') {
      history.pushState(historyState(GAME_SCREEN), '', `#${GAME_SCREEN}`);
      activate(GAME_SCREEN);
      board.resumeGame();
    } else {
      board.abandon();
    }
  });
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
