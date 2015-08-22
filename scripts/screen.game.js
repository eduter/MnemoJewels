mj.screens['game'] = (function() {
    var game = null;
    var input = null;
    var firstRun = true;
    
    function setup() {
        game = mj.modules.game;
        input = mj.modules.input;
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
    
    return {
        run : run
    };
})();
