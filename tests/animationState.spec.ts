import animationState from '../src/animationState';

describe('board animation state', () => {
  beforeEach(() => {
    animationState.reset();
  });

  it('locks input until every overlapping transition completes', () => {
    const fallingGroup = animationState.begin();
    const matchedPair = animationState.begin();

    expect(animationState.isInteractive()).toBe(false);

    animationState.complete(fallingGroup);
    expect(animationState.isInteractive()).toBe(false);

    animationState.complete(matchedPair);
    expect(animationState.isInteractive()).toBe(true);
  });

  it('clears stale transitions when a game restarts', () => {
    animationState.begin();
    animationState.reset();

    expect(animationState.isInteractive()).toBe(true);
  });
});
