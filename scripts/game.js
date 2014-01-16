mj.modules.game = (function() {
    var main = null;
    var board = null;
    var display = null;
    var cards = null;
    var fiRedrawInterval = null;
    var ffScopeSize = 10;
    var TimeMeter = null;
    
    function setup() {
        main = mj.modules.main;
        board = mj.modules.board;
        display = mj.modules.display;
        cards = mj.modules.cards;
        TimeMeter = mj.modules.debug.TimeMeter;
    }
    
    function startGame(psMode) {
        board.initialize(psMode);
        fiRedrawInterval = window.setInterval(
            function(){
                display.redraw(board.getJewels(), board.getSelectedJewel());
            },
            1000/30
        );
    }
    
    function gameOver(pbWin) {
        window.clearInterval(fiRedrawInterval);
        display.redraw(board.getJewels());
        if (pbWin) {
            alert('Well Done!');
        } else {
            alert('Game Over!');
        }
        main.navigateTo('main-menu');
    }
    
    function createNewGroup(piSize, paPairsInUse, pcCallback) {
        TimeMeter.start('CG');
        var callback = function() {
          pcCallback.apply(null, arguments);
          TimeMeter.stop('CG');
        };
        return cards.createNewGroup(piSize, paPairsInUse, callback);
    }
    
    function selectJewel(piRow, piCol) {
        board.selectJewel(piRow, piCol);
    }
    
    function rescheduleMatch(piPairId, paPairsInGroup, piThinkingTime) {
        TimeMeter.start('MA');
        ffScopeSize *= (paPairsInGroup.length - 1) / 100 + 1;
        cards.rescheduleMatch(piPairId, paPairsInGroup, piThinkingTime);
        TimeMeter.stop('MA');
    }
    
    function rescheduleMismatch(paMismatchedPairs, paPairsInGroup, piThinkingTime) {
        TimeMeter.start('MI');
        ffScopeSize *= 0.9;
        cards.rescheduleMismatch(paMismatchedPairs, paPairsInGroup, piThinkingTime);
        TimeMeter.stop('MI');
    }
    
    function redraw(paJewels, pmSelectedJewel) {
        display.redraw(paJewels, pmSelectedJewel);
    }
    
    function getScopeSize() {
        return Math.max(1, Math.round(ffScopeSize));
    }

    // expose public methods
    return {
        setup : setup,
        createNewGroup : createNewGroup,
        startGame : startGame,
        gameOver : gameOver,
        selectJewel : selectJewel,
        rescheduleMatch : rescheduleMatch,
        rescheduleMismatch : rescheduleMismatch,
        redraw : redraw,
        getScopeSize : getScopeSize,
        getStats : function() {
            return TimeMeter.getStats('MA') + ' ' + TimeMeter.getStats('MI') + ' ' + TimeMeter.getStats('CG');
        }
    };
})();
