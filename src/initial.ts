import '../stylesheet/initial.css';
import install from './install';
import spinner from './spinner';

// Attached immediately (not on `load`) so the `beforeinstallprompt` event is
// not missed while the splash screen is still up.
install.setup();

window.addEventListener('load', function () {
  spinner.start();
  import('./additional').then(() => console.log('additional loaded'));
}, false);

if (localStorage.getItem('debug') !== 'true') {
  const noop = function () {};
  window.console = {
    ...console,
    log: noop,
    dir: noop,
    error: noop,
    group: noop,
    groupEnd: noop,
  };
}
