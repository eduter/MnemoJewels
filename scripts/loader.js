var mj = {
    modules : {},
    classes : {},
    screens : {},
    settings : {
        NUM_ROWS : 10,
        DEFAULT_GROUP_SIZE : 3,
        MIN_INTERVAL     :  3000,
        INITIAL_INTERVAL :  7000,
        MAX_INTERVAL     : 10000,
        MISMATCH_PENALTY_TIME: 1500,
        INTERVAL_REDUCTION_FACTOR : 0.9,
        MAX_LEARNING: 20,
        controls : {
            CLICK : 'selectJewel',
            TOUCH : 'selectJewel'
        }
    }
};

window.addEventListener('load', function() {
    var body = document.getElementsByTagName('body')[0];
    var topContainer = document.getElementById('top-container');

    function resize() {
        var height = window.innerHeight || document.documentElement.clientHeight || body.clientHeight;
        topContainer.style.fontSize = (height / 480) + 'px';
    }

    resize();
    window.onresize = resize;

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
                "scripts/storage.js",
                "scripts/game.js",
                "scripts/board.js",
                "scripts/decks.js",
                "scripts/cards.js",
                "scripts/score.js",
                "scripts/time.js",
                "scripts/display.js",
                "scripts/input.js",
                "scripts/parser.js",
                "scripts/utils.js",
                "scripts/debug.js",
                "scripts/screen.game.js",
                "scripts/screen.deck-stats.js",
                "scripts/screen.top-scores.js",
                "scripts/lib/donut-chart.js",
                "data/testWords.js"
            ],
            complete : function() {
                for (var i in mj.modules) {
                    if (mj.modules.hasOwnProperty(i)) {
                        if (mj.modules[i].setup) {
                            mj.modules[i].setup();
                        }
                    }
                }

                mj.modules.debug.prepareTestDeck();

                //mj.modules.debug.testWeighedRandom();

                // Prevents logging of debug info, unless debug is on
                if (!mj.modules.storage.load('debug')) {
                    var noop = function(){};
                    window.console = {log: noop, dir: noop, error: noop, group: noop, groupEnd: noop};
                }
            }
        }
        ]);
    }
    
}, false);
