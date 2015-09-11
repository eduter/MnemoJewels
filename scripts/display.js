mj.modules.display = (function() {
    var dom = mj.dom;
    var $ = dom.$;
    var foBoard = null;
    var NUM_ROWS = mj.settings.NUM_ROWS;
    var stats = null;

    function setup() {
        // TODO: display this in the game screen
        mj.modules.main.bind('scoreUp', function (eventData) {
            console.log('Score Up ' + JSON.stringify(eventData));
        });
        mj.modules.main.bind('levelUp', function (eventData) {
            console.log('Level Up ' + JSON.stringify(eventData));
        });
    }
    
    function getBoardElem() {
        if (foBoard == null) {
            foBoard = $('#board')[0];
        }
        return foBoard;
    }
    
    function getStatsElem() {
        if (stats == null) {
            stats = $('#stats')[0];
        }
        return stats;
    }

    function redraw(paJewels, pmSelectedJewel) {
        mj.modules.debug.TimeMeter.start('D');
        var moBoard = getBoardElem();
        var i, j, moCell;
        
        for (i = 0; i < NUM_ROWS; i++) {
            for (j = 0; j < 2; j++) {
                moCell = moBoard.rows[i].cells[j];
                moCell.className = '';
                moCell.innerHTML = '';
            }
        }
        for (j = 0; j < paJewels.length; j++) {
            for (i = 0; i < paJewels[0].length; i++) {
                var moJewel = paJewels[j][i];
                moCell = moBoard.rows[NUM_ROWS - i - 1].cells[j];
                moCell.className = 'group' + moJewel.groupId;
                moCell.innerHTML = moJewel.getText();
                if (pmSelectedJewel && pmSelectedJewel.row == i && pmSelectedJewel.col == j) {
                    dom.addClass(moCell, 'selected');
                }
            }
        }
        getStatsElem().innerHTML = 'LEVEL: ' + mj.modules.game.getLevel() + ' SCORE: ' + mj.modules.score.getScore() + '<br>' + mj.modules.game.getStats();
        mj.modules.debug.TimeMeter.stop('D');
    }
    
    return {
        setup: setup,
        redraw: redraw
    };
})();
