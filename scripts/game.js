mj.modules.game = (function() {
    var dom = mj.dom;
    var $ = dom.$;
    var board;
    var display;
    var cards;
    var history = [];
    var currentScreen = null;
    
    function showScreen(screenId) {
        // run the screen module setup, if any
        if (mj.screens[screenId] && mj.screens[screenId].run) {
            mj.screens[screenId].run();
        }
        // display new screen
        dom.addClass(getScreen(screenId), 'active');
    }
    
    function hideScreen(screenId) {
        dom.removeClass(getScreen(screenId), 'active');
    }
    
    function getScreen(screenId) {
        return $('#' + screenId)[0];
    }
    
    function navigateTo(screenId) {
        if (currentScreen) {
            hideScreen(currentScreen);
            history.push(currentScreen);
        }
        currentScreen = screenId;
        showScreen(currentScreen);
    }
    
    function back() {
        hideScreen(currentScreen);
        currentScreen = history.pop();
        showScreen(currentScreen);
    }
    
    function setup() {
        board = mj.modules.board;
        display = mj.modules.display;
        cards = mj.modules.cards;
        
        // disable native touchmove behavior to prevent overscroll
        dom.bind(document, 'touchmove', function(event) {
            event.preventDefault();
        });
        
        // hide the address bar on Android devices
        if (/Android/.test(navigator.userAgent)) {
            $('html')[0].style.height = '200%';
            setTimeout(function() {
                window.scrollTo(0, 1);
            }, 0);
        }
        
        // handle navigation button clicks
        dom.bind('body', 'click', function(e) {
            if (e.target.nodeName.toLowerCase() === 'button') {
              if (e.target.className == 'back') {
                back();
              } else if (e.target.className = 'nav') {
                navigateTo(e.target.getAttribute('name'));
              }
            }
        });
    }
    
    function startGame() {
        board.initialize();
        display.redraw(board.getJewels());
    }
    
    function getNextGroup(piSize, paPairsInUse) {
        return cards.getNextGroup(piSize, paPairsInUse);
    }
    
    // expose public methods
    return {
        setup : setup,
        navigateTo : navigateTo,
        getNextGroup : getNextGroup,
        startGame : startGame
    };
})();
