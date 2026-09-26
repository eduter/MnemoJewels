export type GameOverAction = 'replay' | 'menu';

export function getGameOverAction(returnValue: string): GameOverAction {
  return returnValue === 'replay' ? 'replay' : 'menu';
}
