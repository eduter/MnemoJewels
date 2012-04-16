mj.modules.game = (function() {
    var board = null;
    var display = null;
    var cards = null;
    
    function setup() {
        board = mj.modules.board;
        display = mj.modules.display;
        cards = mj.modules.cards;
    }
    
    function startGame() {
        board.initialize();
        display.redraw(board.getJewels());
    }
    
    function getNextGroup(piSize, paPairsInUse) {
        return cards.getNextGroup(piSize, paPairsInUse);
    }
    
    function selectJewel(piRow, piCol) {
        board.selectJewel(piRow, piCol);
    }
    
    function rescheduleMatch(piPairId, paPairsInGroup, piThinkingTime) {
        cards.rescheduleMatch(piPairId, paPairsInGroup, piThinkingTime);
    }
    
    function rescheduleMismatch(paMismatchedPairs, paPairsInGroup, piThinkingTime) {
        cards.rescheduleMismatch(paMismatchedPairs, paPairsInGroup, piThinkingTime);
    }
    
    function redraw(paJewels, pmSelectedJewel) {
        display.redraw(paJewels, pmSelectedJewel);
    }
    
    // expose public methods
    return {
        setup : setup,
        getNextGroup : getNextGroup,
        startGame : startGame,
        selectJewel : selectJewel,
        rescheduleMatch : rescheduleMatch,
        rescheduleMismatch : rescheduleMismatch,
        redraw : redraw
    };
})();
