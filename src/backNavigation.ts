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
 * underneath the app's own history — resolves to the menu, and backing out of a
 * running game prompts the resume/quit dialog instead of leaving silently.
 */
export function resolveBackNavigation(
  state: unknown,
  currentScreen: string | null,
  knownScreens: ReadonlySet<string>,
): BackDecision {
  const target = getScreenFromState(state);

  if (target === null || !knownScreens.has(target)) {
    return { action: 'menu' };
  }
  if (target === MENU_SCREEN && currentScreen === GAME_SCREEN) {
    return { action: 'interrupt' };
  }
  return { action: 'screen', screen: target };
}
