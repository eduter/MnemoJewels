require('../stylesheet/initial.scss');
import spinner from './spinner'

window.mj = {
    modules: {},
    screens: {},
    decks: [],
    settings: {
        NUM_ROWS: 10,
        DEFAULT_GROUP_SIZE: 3,
        MIN_INTERVAL    :  3000,
        INITIAL_INTERVAL:  7000,
        MAX_INTERVAL    : 10000,
        MISMATCH_PENALTY_TIME: 1500,
        INTERVAL_REDUCTION_FACTOR: 0.9,
        MAX_LEARNING: 20,
        controls: {
            CLICK: 'selectJewel',
            TOUCH: 'selectJewel'
        }
    }
};

window.addEventListener('load', function() {
    var body = document.getElementsByTagName('body')[0];
    var topContainer = document.getElementById('top-container');

    function resize() {
        var height = window.innerHeight || document.documentElement.clientHeight || body.clientHeight;
        topContainer.style.fontSize = (height / 480) + 'px';
    }

    window.onresize = resize;
    resize();
    spinner.start();
    require(["./additional"]);
}, false);

// Prevents logging of debug info, unless debug is on
if (localStorage.getItem('debug') !== 'true') {
    var noop = function(){};
    window.console = {log: noop, dir: noop, error: noop, group: noop, groupEnd: noop};
}
