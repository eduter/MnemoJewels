mj.modules.game = (function() {
    var main = null;
    var board = null;
    var display = null;
    var cards = null;
    var settings = mj.settings;
    var fiRedrawInterval = null;
    var increment, ffScopeSize;
    var TimeMeter = null;
    var averageThinkingTimes = [
        settings.INITIAL_INTERVAL / 6,
        settings.INITIAL_INTERVAL / 3,
        settings.INITIAL_INTERVAL / 2
    ];

    var intervalBetweenGroups;

    function setup() {
        main = mj.modules.main;
        board = mj.modules.board;
        display = mj.modules.display;
        cards = mj.modules.cards;
        TimeMeter = mj.modules.debug.TimeMeter;
        main.bind('match', onMatch);
        main.bind('mismatch', onMismatch);
    }
    
    function startGame() {
        var t = cards.getTotalCards();
        ffScopeSize = saturate(30, 0.1 * t, 100);
        increment = saturate(3, (t - ffScopeSize) / (5 * 60 * 1000 / getAverageThinkingTime()), 10);
        intervalBetweenGroups = getIntervalBetweenGroups(settings.DEFAULT_GROUP_SIZE);
        board.initialize();
        fiRedrawInterval = window.setInterval(
            function(){
                display.redraw(board.getJewels(), board.getSelectedJewel());
            },
            1000/6
        );
    }
    
    function gameOver() {
        window.clearInterval(fiRedrawInterval);
        display.redraw(board.getJewels());
        alert('Game Over!');
        main.navigateTo('main-menu');

        cards.debugReview(); // TODO
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
    
    function onMatch(eventData) {
        var pairsLeft = eventData.pairsInGroup.length - 1;
        ffScopeSize += increment;
        averageThinkingTimes[pairsLeft] = 0.6 * averageThinkingTimes[pairsLeft] + 0.4 * eventData.thinkingTime;
    }
    
    function onMismatch() {
        ffScopeSize -= Math.max(5, 0.1 * ffScopeSize);
    }

    function handleBoardCleared() {
        // TODO: keep or remove this?
    }

    function redraw(paJewels, pmSelectedJewel) {
        display.redraw(paJewels, pmSelectedJewel);
    }
    
    function getScopeSize() {
        return saturate(3, Math.round(ffScopeSize), cards.getTotalCards());
    }

    function saturate(min, value, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getIntervalBetweenGroups(numPairs){
        if (numPairs > 2) {
            intervalBetweenGroups = (numPairs - 2) * getAverageThinkingTime();
        } else {
            intervalBetweenGroups = settings.MIN_INTERVAL;
        }
        return intervalBetweenGroups;
    }

    function getAverageThinkingTime() {
        return (averageThinkingTimes[0] + averageThinkingTimes[1] + averageThinkingTimes[2]) / 3;
    }

    // expose public methods
    return {
        setup : setup,
        createNewGroup : createNewGroup,
        startGame : startGame,
        gameOver : gameOver,
        selectJewel : selectJewel,
        handleBoardCleared: handleBoardCleared,
        redraw : redraw,
        getScopeSize : getScopeSize,
        getIntervalBetweenGroups : getIntervalBetweenGroups,
        getStats : function() {
            return mj.modules.debug.getStats()
                  + ' p: ' + Math.round(intervalBetweenGroups / 100) / 10
                  + ' s: ' + getScopeSize();
        }
    };
})();
