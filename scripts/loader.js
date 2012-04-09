var jewel = {
    screens : {},
    settings : {
        NUM_ROWS : 10,
        DEFAULT_GROUP_SIZE : 3,
        TIME_FOR_NEXT_GROUP : 5000
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
                "scripts/board.js",
                "scripts/game.js",
                "scripts/cards.js",
                "scripts/display.js",
                "scripts/screen.game_classic.js"
            ]
        },{
            test : Modernizr.standalone,
            yep : "scripts/screen.splash.js",
            nope : "scripts/screen.install.js",
            complete : function() {
                jewel.game.setup();
                if (Modernizr.standalone) {
                    jewel.game.navigateTo("splash-screen");
                } else {
                    jewel.game.navigateTo("install-screen");
                }
            }
        }
    ]);
    
    // loading stage 2
    if (Modernizr.standalone) {
        Modernizr.load([
        {
            load : [
                "scripts/board.js"
            ]
        }
        ]);
    }
    
}, false);
