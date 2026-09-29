export const MENU_SCREEN = 'main-menu';
export const GAME_SCREEN = 'game';

export interface ScreenState {
  screen: string;
}

export type BackDecision =
  | { action: 'menu' }
  | { action: 'interrupt' }
  | { action: 'screen'; screen: string };

export function getScreenFromState(state: unknown): string | null {
  if (state && typeof state === 'object' && typeof (state as { screen?: unknown }).screen === 'string') {
    return (state as ScreenState).screen;
  }
  return null;
}

export function historyState(screenId: string): ScreenState {
  return { screen: screenId };
}

/**
 * Maps a Back (or Forward) history transition to the reaction the app should
 * take. Anything the app does not recognise — including the document entry
 * underneath the app's own history — resolves to the menu.
 *
 * A Back press while the game is on screen always asks the player, regardless of
 * which entry the pop landed on. The entry below the game is the menu, so keying
 * this on the popped entry would make every second Back press skip the prompt and
 * walk out of the app.
 */
export function resolveBackNavigation(
  state: unknown,
  currentScreen: string | null,
  knownScreens: ReadonlySet<string>,
): BackDecision {
  const target = getScreenFromState(state);

  // The visible screen wins: a Back press while the game is on screen must ask
  // the player even if the pop landed on an unrecognised entry (the menu below
  // the game, or the document floor below the app).
  if (currentScreen === GAME_SCREEN) {
    return { action: 'interrupt' };
  }
  if (target === null || !knownScreens.has(target)) {
    return { action: 'menu' };
  }
  return { action: 'screen', screen: target };
}
