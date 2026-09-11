import game from './game';
import input from './input';

function setup(): void {
  input.initialize();
  input.bind('selectJewel', game.selectJewel);
}

function update(): void {
  game.startGame();
}

export default {
  setup,
  update,
};
