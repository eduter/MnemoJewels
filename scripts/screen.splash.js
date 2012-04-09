jewel.screens['splash-screen'] = (function() {
    var game = jewel.game;
    var dom = jewel.dom;
    var firstRun = true;
    
    function setup() {
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
