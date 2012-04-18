mj.screens['splash-screen'] = (function() {
    var dom = mj.dom;
    var main;
    var firstRun = true;
    
    function setup() {
        main = mj.modules.main;
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
