import game from './game'
import input from './input'


function setup() {
    input.initialize();
    input.bind('selectJewel', game.selectJewel);
}

function update() {
    game.startGame();
}

export default {
    setup: setup,
    update: update
};
