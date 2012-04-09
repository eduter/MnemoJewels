mj.screens['game_classic'] = (function() {
    var dom = mj.dom;
    var game;
    var firstRun = true;
    
    function setup() {
        game = mj.modules.game;
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
