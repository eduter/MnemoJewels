import { describe, expect, it } from 'vitest';
import {
  getScreenFromState,
  historyState,
  resolveBackNavigation,
} from '../src/backNavigation';

const known = new Set(['main-menu', 'game', 'about', 'settings', 'deck-stats', 'top-scores']);

describe('resolveBackNavigation', () => {
  it('treats any known non-game screen as a plain screen change', () => {
    expect(resolveBackNavigation(historyState('settings'), 'about', known))
      .toEqual({ action: 'screen', screen: 'settings' });
    expect(resolveBackNavigation(historyState('about'), 'settings', known))
      .toEqual({ action: 'screen', screen: 'about' });
  });

  it('falls back to the menu for unknown or missing history state', () => {
    expect(resolveBackNavigation(null, 'about', known)).toEqual({ action: 'menu' });
    expect(resolveBackNavigation(undefined, 'about', known)).toEqual({ action: 'menu' });
    expect(resolveBackNavigation({}, 'about', known)).toEqual({ action: 'menu' });
    expect(resolveBackNavigation({ screen: 'nope' }, 'about', known)).toEqual({ action: 'menu' });
  });

  it('prompts the resume/quit dialog when leaving a running game', () => {
    expect(resolveBackNavigation(historyState('main-menu'), 'game', known))
      .toEqual({ action: 'interrupt' });
  });

  it('prompts the dialog whatever entry the pop landed on while the game is on screen', () => {
    // The entry below the game is the menu, but the pop can land anywhere (e.g.
    // after the pause was dismissed); the visible screen is what matters, so Back
    // keeps asking instead of walking out of the app.
    expect(resolveBackNavigation(historyState('game'), 'game', known))
      .toEqual({ action: 'interrupt' });
    expect(resolveBackNavigation(historyState('about'), 'game', known))
      .toEqual({ action: 'interrupt' });
    expect(resolveBackNavigation(historyState('settings'), 'game', known))
      .toEqual({ action: 'interrupt' });
    // Even the unrecognised floor entry below the app must not end the run.
    expect(resolveBackNavigation(null, 'game', known))
      .toEqual({ action: 'interrupt' });
    expect(resolveBackNavigation({}, 'game', known))
      .toEqual({ action: 'interrupt' });
  });

  it('just shows the menu when the game was already left', () => {
    expect(resolveBackNavigation(historyState('main-menu'), 'settings', known))
      .toEqual({ action: 'screen', screen: 'main-menu' });
  });
});

describe('history state helpers', () => {
  it('round-trips a screen id', () => {
    expect(getScreenFromState(historyState('game'))).toBe('game');
  });

  it('ignores foreign or malformed state', () => {
    expect(getScreenFromState(null)).toBeNull();
    expect(getScreenFromState('game')).toBeNull();
    expect(getScreenFromState({ screen: 42 })).toBeNull();
  });
});
