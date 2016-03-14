import game from './game'
import input from './input'


    var firstRun = true;
    
    function setup() {
        console.log('screen.game setup');
        input.initialize();
        input.bind('selectJewel', game.selectJewel);
    }
    
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
        }
        game.startGame();
    }
    
    export default {
        run : run
    };
