// TODO: Refactor this whole module. This mess with the events might be what makes the game so slow on Safari Mobile.

import {NUM_ROWS} from './constants'
import $ from 'jquery'


var inputHandlers = null;
var fmLastStart = null;

const controls = {
    CLICK: 'selectJewel',
    TOUCH: 'selectJewel'
};

function initialize() {
    let $board = $('#board');

    inputHandlers = {};

    $board.bind('mousedown', function(event) {
        handleClick(event, "CLICK", true, event);
    });
    $board.bind('mouseup', function(event) {
        handleClick(event, 'CLICK', false, event);
    });
    // $board.bind('touchstart', function(event) {
    //     handleClick(event, 'TOUCH', true, event.targetTouches[0]);
    // });
    // $board.bind('touchend', function(event) {
    //     handleClick(event, 'TOUCH', false, event.targetTouches[0]);
    // });
}

function bind(action, handler) {
    if (!inputHandlers[action]) {
        inputHandlers[action] = [];
    }
    inputHandlers[action].push(handler);
}

function trigger(action) {
    var handlers = inputHandlers[action];
    var args = Array.prototype.slice.call(arguments, 1);

    if (handlers) {
        for (var i=0;i<handlers.length;i++) {
            handlers[i].apply(null, args);
        }
    }
}

function handleClick(event, control, pbStart, click) {
    // is any action bound to this input control?
    var action = controls[control];
    if (!action) {
        return;
    }

    var moTarget = (control == 'TOUCH' ? event.targetTouches[0].target : event.target);
    var miCol = moTarget.cellIndex;
    var miRow = NUM_ROWS - moTarget.parentNode.rowIndex - 1;

    if (pbStart) {
        fmLastStart = {row: miRow, col: miCol};
    } else if (fmLastStart && fmLastStart.row == miRow && fmLastStart.col == miCol) {
        return;
    }

    trigger(action, miRow, miCol);
    /*
    var board = $("#game-screen .game-board")[0],
        rect = board.getBoundingClientRect(),
        relX, relY,
        jewelX, jewelY;

    // click position relative to board
    relX = click.clientX - rect.left;
    relY = click.clientY - rect.top;
    // jewel coordinates
    jewelX = Math.floor(relX / rect.width * constants.cols);
    jewelY = Math.floor(relY / rect.height * constants.rows);
    // trigger functions bound to action
    trigger(action, jewelX, jewelY);
    // prevent default click behavior
    */
    event.preventDefault();
}

export default {
    initialize : initialize,
    bind : bind
};
