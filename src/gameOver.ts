export type GameOverAction = 'replay' | 'menu';

export function getGameOverAction(returnValue: string): GameOverAction {
  return returnValue === 'replay' ? 'replay' : 'menu';
}

export type PauseAction = 'resume' | 'quit';

export function getPauseAction(returnValue: string): PauseAction {
  return returnValue === 'quit' ? 'quit' : 'resume';
}
