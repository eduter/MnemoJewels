import { getGameOverAction } from '../src/gameOver';

describe('game over dialog actions', () => {
  it('replays only when the dialog closes with the play-again value', () => {
    expect(getGameOverAction('replay')).toBe('replay');
  });

  it('returns to the menu for cancel, escape, and the menu button', () => {
    expect(getGameOverAction('menu')).toBe('menu');
    expect(getGameOverAction('')).toBe('menu');
    expect(getGameOverAction('cancel')).toBe('menu');
  });
});
