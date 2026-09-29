import { getGameOverAction, getPauseAction } from '../src/gameOver';

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

describe('pause dialog actions', () => {
  it('quits only when the dialog closes with the quit value', () => {
    expect(getPauseAction('quit')).toBe('quit');
  });

  it('resumes for cancel, escape, and the resume button', () => {
    expect(getPauseAction('resume')).toBe('resume');
    expect(getPauseAction('')).toBe('resume');
    expect(getPauseAction('cancel')).toBe('resume');
  });
});
