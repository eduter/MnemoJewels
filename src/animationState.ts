const activeTransitions = new Set<number>();
let nextTransitionId = 1;

function begin(): number {
  const transitionId = nextTransitionId++;
  activeTransitions.add(transitionId);
  return transitionId;
}

function complete(transitionId: number): void {
  activeTransitions.delete(transitionId);
}

function reset(): void {
  activeTransitions.clear();
}

function isInteractive(): boolean {
  return activeTransitions.size === 0;
}

export default {
  begin,
  complete,
  reset,
  isInteractive,
};
