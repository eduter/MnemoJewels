mj.modules.display = (function() {
    var $ = mj.dom.$;
    var foBoard = null;
    var NUM_ROWS = mj.settings.NUM_ROWS;
    
    function setup() {
        board = mj.modules.board;
    }
    
    function getBoardElem() {
        if (foBoard == null) {
            foBoard = $('#board')[0];
        }
        return foBoard;
    }
    
    function redraw(paJewels) {
        var moBoard = getBoardElem();
        console.dir(mj);
        
        for (var i = 0; i < NUM_ROWS; i++) {
            for (var j = 0; j < 2; j++) {
                var moCell = moBoard.rows[i].cells[j];
                moCell.className = '';
                moCell.innerHTML = '';
            }
        }
        for (var i in paJewels) {
            for (var j in paJewels[i]) {
                var moJewel = paJewels[i][j];
                var moCell = moBoard.rows[NUM_ROWS - i - 1].cells[j];
                moCell.className = 'group' + moJewel.fiGroupId;
                moCell.innerHTML = moJewel.fsText;
            }
        }
    }
    
    return {
        redraw : redraw
    };
})();
