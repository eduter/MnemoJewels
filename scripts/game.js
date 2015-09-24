mj.modules.game = (function() {

    // Aliases
    var settings = mj.settings;
    var main, board, display, cards, score, time, TimeMeter;

    var POINTS_PER_LEVEL = 1000;
    var LAST_LEVEL = 10;

    /**
     * Timestamp of when the current game started.
     * @type {timestamp}
     */
    var gameStart;

    /**
     * Current level.
     * @type {int}
     */
    var level = 1;

    var increment, ffScopeSize;
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
        score = mj.modules.score;
        time = mj.modules.time;
        TimeMeter = mj.modules.debug.TimeMeter;
        main.bind('match', onMatch);
        main.bind('mismatch', onMismatch);
        main.bind('scoreUp', onScoreUp);
    }
    
    function startGame() {
        var t = cards.getTotalCards();
        ffScopeSize = saturate(30, 0.1 * t, 100);
        increment = saturate(3, (t - ffScopeSize) / (5 * 60 * 1000 / getAverageThinkingTime()), 10);
        intervalBetweenGroups = getIntervalBetweenGroups(settings.DEFAULT_GROUP_SIZE);
        gameStart = time.now();
        level = 1;
        board.initialize();
        main.trigger('gameStart');
    }
    
    function gameOver() {
        display.redraw(board.getJewels());
        alert('Game Over!');
        main.navigateTo('main-menu');
        main.trigger('gameOver', {
            score: score.getScore(),
            gameStart: gameStart,
            gameEnd: time.now()
        });

        cards.debugReview(); // TODO
    }

    function selectJewel(piRow, piCol) {
        board.selectJewel(piRow, piCol);
    }
    
    function onMatch(eventData) {
        var remainingCards = eventData.cardsInGroup.length - 1;
        ffScopeSize += increment;
        averageThinkingTimes[remainingCards] = 0.6 * averageThinkingTimes[remainingCards] + 0.4 * eventData.thinkingTime;
    }
    
    function onMismatch() {
        ffScopeSize -= Math.max(5, 0.1 * ffScopeSize);
    }

    /**
     * Updates the level.
     */
    function onScoreUp() {
        var updatedLevel = Math.min(LAST_LEVEL, Math.floor(score.getScore() / POINTS_PER_LEVEL) + 1);
        if (updatedLevel > level) {
            level = updatedLevel;
            main.trigger('levelUp', {level: level});
        }
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

    function getIntervalBetweenGroups(numCards){
        if (numCards > 2) {
            intervalBetweenGroups = Math.min((numCards - 2) * getAverageThinkingTime(), getMaxInterval());
        } else {
            intervalBetweenGroups = settings.MIN_INTERVAL;
        }
        return intervalBetweenGroups;
    }

    /**
     * Calculates the maximum interval between groups, based on game difficulty.
     * @returns {number} - maximum interval in milliseconds
     */
    function getMaxInterval() {
        var max = settings.MAX_INTERVAL;
        var min = settings.MIN_INTERVAL;
        return max - getDifficulty() * (max - min);
    }

    /**
     * Calculates the difficulty of the game, based on the current level.
     * @returns {number} a number between 0 (easiest) and 1 (hardest)
     */
    function getDifficulty() {
        return Math.pow(level - 1, 2) / Math.pow(LAST_LEVEL - 1, 2);
    }

    function getAverageThinkingTime() {
        return (averageThinkingTimes[0] + averageThinkingTimes[1] + averageThinkingTimes[2]) / 3;
    }

    // expose public methods
    return {
        setup : setup,
        startGame : startGame,
        gameOver : gameOver,
        selectJewel : selectJewel,
        redraw : redraw,
        getScopeSize : getScopeSize,
        getLevel: function(){ return level },
        getDifficulty: getDifficulty,
        getIntervalBetweenGroups : getIntervalBetweenGroups,
        getStats : function() {
            return mj.modules.debug.getStats()
                  + ' p: ' + Math.round(intervalBetweenGroups / 100) / 10
                  + ' s: ' + getScopeSize();
        }
    };
})();
