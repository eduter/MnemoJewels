function start(): void {
  const target = document.querySelector('#splash-screen .spinner');
  if (target) {
    target.classList.add('active');
  }
}

function stop(): void {
  const target = document.querySelector('#splash-screen .spinner');
  if (target) {
    target.classList.remove('active');
  }
  console.log('spinner.stop()');
}

export default {
  start,
  stop,
};
