mj.modules.game = (function() {
    var board = null;
    var display = null;
    var cards = null;
    var fiRedrawInterval = null;
    
    function setup() {
        board = mj.modules.board;
        display = mj.modules.display;
        cards = mj.modules.cards;
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
    }
    
    function createNewGroup(piSize, paPairsInUse, pcCallback) {
        return cards.createNewGroup(piSize, paPairsInUse, pcCallback);
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
        createNewGroup : createNewGroup,
        startGame : startGame,
        gameOver : gameOver,
        selectJewel : selectJewel,
        rescheduleMatch : rescheduleMatch,
        rescheduleMismatch : rescheduleMismatch,
        redraw : redraw
    };
})();
