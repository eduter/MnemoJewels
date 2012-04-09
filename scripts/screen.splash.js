mj.screens['splash-screen'] = (function() {
    var dom = mj.dom;
    var game;
    var firstRun = true;
    
    function setup() {
        game = mj.modules.game;
        dom.bind('#splash-screen', 'click', function() {
            game.navigateTo('main-menu');
        });
    }
    
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
        }
    }
    
    return {
        run : run
    };
})();
