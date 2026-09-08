import decks from './decks'
import events from './events'
import imageLoader from './imageLoader'
import navigation from './navigation'
import spinner from './spinner'
import storage from './storage'

import '../stylesheet/additional.css';


// disable native touchmove behavior to prevent overscroll
document.addEventListener('touchmove', event => event.preventDefault(), { passive: false });

// handles closing browser's tab/window or navigating away from MJ
window.addEventListener('pagehide', function() {
    events.trigger('exitApp', null, true);
});
window.addEventListener('beforeunload', function() {
    events.trigger('exitApp', null, true);
});

/**
 * List of images to load before leaving the splash screen.
 * @type {string[]}
 */
let images = [
    '/images/jewel.svg'
];

/**
 * List of promises which need to be fulfilled before hiding the splash screen.
 * @type {Promise[]}
 */
let promises = [];

// initializes the storage
promises.push(storage.setup());

// loads all images
promises.push(imageLoader.loadImages(images).then(() => console.log('images loaded')));

// once everything is loaded and initialized, let the user proceed
Promise.all(promises).then(function() {
    var screen = document.getElementById('splash-screen');
    screen.addEventListener('click', function() {
        screen.classList.remove('active');
        if (decks.getSelectedDeck() == null) {
            navigation.navigateTo('settings');
        } else {
            navigation.navigateTo('main-menu');
        }
    });
    screen.querySelector('.continue').classList.remove('hidden');
    spinner.stop();
});
