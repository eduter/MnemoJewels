mj.modules.display = (function() {
    var dom = mj.dom;
    var $ = dom.$;
    var foBoard = null;
    var NUM_ROWS = mj.settings.NUM_ROWS;
    
    function setup() {
    }
    
    function getBoardElem() {
        if (foBoard == null) {
            foBoard = $('#board')[0];
        }
        return foBoard;
    }
    
    function redraw(paJewels, pmSelectedJewel) {
        var moBoard = getBoardElem();
        
        for (var i = 0; i < NUM_ROWS; i++) {
            for (var j = 0; j < 2; j++) {
                var moCell = moBoard.rows[i].cells[j];
                moCell.className = '';
                moCell.innerHTML = '';
            }
        }
        for (var j in paJewels) {
            for (var i in paJewels[j]) {
                var moJewel = paJewels[j][i];
                var moCell = moBoard.rows[NUM_ROWS - i - 1].cells[j];
                moCell.className = 'group' + moJewel.fiGroupId;
                moCell.innerHTML = moJewel.fsText;
                if (pmSelectedJewel && pmSelectedJewel.row == i && pmSelectedJewel.col == j) {
                    dom.addClass(moCell, 'selected');
                }
            }
        }
    }
    
    return {
        redraw : redraw
    };
})();
