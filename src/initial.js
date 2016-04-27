require('../stylesheet/initial.scss');
import spinner from './spinner'


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
    require(["./additional"], () => console.log('additional.js loaded'));
}, false);

// Prevents logging of debug info, unless debug is on
if (localStorage.getItem('debug') !== 'true') {
    var noop = function(){};
    window.console = {log: noop, dir: noop, error: noop, group: noop, groupEnd: noop};
}
