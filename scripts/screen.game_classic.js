jewel.screens['game_classic'] = (function() {
    var game = jewel.game;
    var dom = jewel.dom;
    var firstRun = true;
    
    function setup() {
    }
    
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
        }
        game.startGame();
    }
    
    return {
        run : run
    };
})();
