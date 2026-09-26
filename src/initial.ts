import '../stylesheet/initial.css';
import spinner from './spinner';

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
