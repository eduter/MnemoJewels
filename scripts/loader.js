var mj = {
    modules : {},
    classes : {},
    screens : {},
    settings : {
        NUM_ROWS : 10,
        DEFAULT_GROUP_SIZE : 3,
        INITIAL_INTERVAL : 7000,
        MIN_INTERVAL : 2000,
        MISMATCH_PENALTY_TIME: 1500,
        INTERVAL_REDUCTION_FACTOR : 0.9,
        controls : {
            CLICK : 'selectJewel',
            TOUCH : 'selectJewel'
        }
    }
};

window.addEventListener('load', function() {
    
    Modernizr.addTest("standalone", function() {
        return (window.navigator.standalone != false);
    });
    
    // loading stage 1
    Modernizr.load([
        {
            load : [
                "scripts/lib/sizzle.js",
                "scripts/dom.js",
                "scripts/main.js"
            ]
        },{
            test : Modernizr.standalone,
            yep : "scripts/screen.splash.js",
            nope : "scripts/screen.install.js",
            complete : function() {
                mj.modules.main.setup();
                if (Modernizr.standalone) {
                    mj.modules.main.navigateTo("splash-screen");
                } else {
                    mj.modules.main.navigateTo("install-screen");
                }
            }
        }
    ]);
    
    // loading stage 2
    if (Modernizr.standalone) {
        Modernizr.load([
        {
            load : [
                "scripts/classes.js",
                "scripts/database.js",
                "scripts/game.js",
                "scripts/board.js",
                "scripts/cards.js",
                "scripts/display.js",
                "scripts/input.js",
                "scripts/parser.js",
                "scripts/debug.js",
                "scripts/screen.game_classic.js",
                "scripts/screen.settings.js",
                "data/testWords.js"
            ],
            complete : function() {
                for (var i in mj.modules) {
                    if (mj.modules[i].setup) {
                        mj.modules[i].setup();
                    }
                }
                // Turns off debugging info
                var noop = function(){}; window.console = {log: noop, dir: noop, error: noop, group: noop, groupEnd: noop};
            }
        }
        ]);
    }
    
}, false);
