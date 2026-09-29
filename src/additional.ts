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
  spinner.stop();
  const target = decks.getSelectedDeck() == null ? 'settings' : 'main-menu';
  // The splash replaced the initial document entry, so the app's first screen
  // *is* the bottom of the history stack: Back from it leaves the app.
  navigation.navigateTo(target, { replace: true });
});
