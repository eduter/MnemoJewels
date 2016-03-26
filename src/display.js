import constants from './constants'
import $ from 'jquery'
import events from './events'
import board from './board'
import score from './score'
import game from './game'
import TimeMeter from './TimeMeter'

var foBoard = null;
var NUM_ROWS = constants.NUM_ROWS;
var stats = null;

var redrawIntervalId;

(function setup() {
    // TODO: display this in the game screen
    events.bind('scoreUp', function (eventData) {
        console.log('Score Up ' + JSON.stringify(eventData));
    });
    events.bind('levelUp', function (eventData) {
        console.log('Level Up ' + JSON.stringify(eventData));
    });

    events.bind('gameStart', onGameStart);
    events.bind('gameOver', onGameOver);
})();

function onGameStart() {
    redrawIntervalId = setInterval(
        function(){
            redraw(board.getJewels(), board.getSelectedJewel());
        },
        1000/6
    );
}

function onGameOver() {
    clearInterval(redrawIntervalId);
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
    TimeMeter.start('D');
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
                moCell.className += ' selected';
            }
        }
    }
    getStatsElem().innerHTML = 'SCORE: ' + score.getScore() + '<br>' + game.getStats();
    TimeMeter.stop('D');
}

export default {
    redraw: redraw
};
