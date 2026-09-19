import '../stylesheet/initial.css';
import spinner from './spinner';

window.addEventListener('load', function () {
  const body = document.getElementsByTagName('body')[0];
  const topContainer = document.getElementById('top-container')!;

  function resize(): void {
    const height = window.innerHeight || document.documentElement.clientHeight || body.clientHeight;
    topContainer.style.fontSize = (height / 480) + 'px';
  }

  window.onresize = resize;
  resize();
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
