mj.modules.game = (function() {
    var main = null;
    var board = null;
    var display = null;
    var cards = null;
    var settings = mj.settings;
    var fiRedrawInterval = null;
    var ffScopeSize = 10;
    var TimeMeter = null;

    var intervalBetweenGroups;

    function setup() {
        main = mj.modules.main;
        board = mj.modules.board;
        display = mj.modules.display;
        cards = mj.modules.cards;
        TimeMeter = mj.modules.debug.TimeMeter;
    }
    
    function startGame(psMode) {
        intervalBetweenGroups = settings.INTERVAL_BETWEEN_GROUPS;
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

    function handleBoardCleared() {
        // TODO: keep or remove this?
    }

    function updateGameSpeed(numRowsBefore, numRowsAfter) {
        var i = numRowsBefore;
        var increment = (numRowsAfter > numRowsBefore ? 1 : -1);
        var factor = (numRowsAfter > numRowsBefore ? 0.03 : 0.01);
        do {
            i += increment;
            intervalBetweenGroups *= 1 + (i - 4) * factor;
        } while (i == numRowsAfter);
        intervalBetweenGroups = Math.max(Math.min(intervalBetweenGroups, 10000), 3000);
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
        handleBoardCleared: handleBoardCleared,
        redraw : redraw,
        getScopeSize : getScopeSize,
        getIntervalBetweenGroups : function(){ return intervalBetweenGroups; },
        updateGameSpeed: updateGameSpeed,
        getStats : function() {
            return TimeMeter.getStats('MA') + ' ' + TimeMeter.getStats('MI') + ' ' + TimeMeter.getStats('CG') + ' p: ' + Math.round(intervalBetweenGroups / 100) / 10;
        }
    };
})();
