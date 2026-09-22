import decks from './decks';
import events from './events';
import imageLoader from './imageLoader';
import navigation from './navigation';
import spinner from './spinner';
import storage from './storage';

import '../stylesheet/additional.css';

document.addEventListener('touchmove', event => event.preventDefault(), { passive: false });

window.addEventListener('pagehide', function () {
  events.trigger('exitApp', null, true);
});
window.addEventListener('beforeunload', function () {
  events.trigger('exitApp', null, true);
});

const images = [
  `${import.meta.env.BASE_URL}images/jewel.svg`,
];

const promises: Promise<unknown>[] = [];

promises.push(storage.setup());

promises.push(imageLoader.loadImages(images).then(() => console.log('images loaded')));

Promise.all(promises).then(function () {
  const screen = document.getElementById('splash-screen')!;
  screen.addEventListener('click', function () {
    screen.classList.remove('active');
    if (decks.getSelectedDeck() == null) {
      navigation.navigateTo('settings');
    } else {
      navigation.navigateTo('main-menu');
    }
  });
  screen.querySelector('.continue')!.classList.remove('hidden');
  spinner.stop();
});
