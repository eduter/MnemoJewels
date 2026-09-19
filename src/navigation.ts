import gameScreen from './screen.game';
import deckStatsScreen from './screen.deck-stats';
import topScoresScreen from './screen.top-scores';
import settingsScreen from './screen.settings';
import type { ScreenModule } from './types';

const screens: Record<string, ScreenModule> = {
  game: gameScreen,
  'deck-stats': deckStatsScreen,
  'top-scores': topScoresScreen,
  settings: settingsScreen,
};

let currentScreen: string | null = null;
const previousScreens: string[] = [];

(function setup() {
  initializeScreenModules();
  registerListeners();
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

function navigateTo(screenId: string): void {
  if (screenId === currentScreen) {
    throw Error(`Cannot navigate to current screen (${screenId})`);
  } else {
    if (currentScreen) {
      hideScreen(currentScreen);
      previousScreens.push(currentScreen);
    }
    currentScreen = screenId;
    showScreen(currentScreen);
  }
}

function back(): void {
  if (!currentScreen) {
    return;
  }
  hideScreen(currentScreen);
  currentScreen = previousScreens.pop() ?? null;
  if (currentScreen) {
    showScreen(currentScreen);
  }
}

function hideScreen(screenId: string): void {
  getScreen(screenId).classList.remove('active');
}

function showScreen(screenId: string): void {
  if (screens[screenId] && typeof screens[screenId].update === 'function') {
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
