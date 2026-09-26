import '../stylesheet/initial.css';
import spinner from './spinner';

window.addEventListener('load', function () {
  const body = document.getElementsByTagName('body')[0];
  const topContainer = document.getElementById('top-container')!;

  function resize(): void {
    const height = window.innerHeight || document.documentElement.clientHeight || body.clientHeight;
    const width = window.innerWidth || document.documentElement.clientWidth || body.clientWidth;
    topContainer.style.fontSize = Math.min(height / 480, width / 320) + 'px';
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
