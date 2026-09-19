
/**
 * Start/stop a CSS spinner on the splash screen.
 */
function start() {
    var target = document.querySelector('#splash-screen .spinner');
    if (target) {
        target.classList.add('active');
    }
}

function stop() {
    var target = document.querySelector('#splash-screen .spinner');
    if (target) {
        target.classList.remove('active');
    }
    console.log('spinner.stop()');
}


export default {
    start: start,
    stop: stop
}
