mj.screens['splash-screen'] = (function() {
    var dom = mj.dom;
    var main = mj.modules.main;
    var firstRun = true;
    
    function setup() {
        var continueMessage = dom.$('#splash-screen .continue')[0];
        dom.removeClass(continueMessage, 'hidden');
        dom.bind('#splash-screen', 'click', function() {
            main.navigateTo('main-menu');
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
