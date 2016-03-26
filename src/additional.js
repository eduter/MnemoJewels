import decks from './decks'
import events from './events'
import navigation from './navigation'
import spinner from './spinner'
import storage from './storage'
import $ from 'jquery'

require('es6-promise').polyfill();

require('../stylesheet/additional.scss');


/**
 * List of images to load before leaving the splash screen.
 * @type {string[]}
 */
var imagesToLoad = [
    'images/jewel.svg'
];

(function setup() {
    // disable native touchmove behavior to prevent overscroll
    $(document).on('touchmove', event => event.preventDefault());

    // handles closing browser's tab/window or navigating away from MJ
    $(window).on('unload beforeunload', function() {
        events.trigger('exitApp', null, true);
    });

    let promises = [];

    // initializes the storage
    promises.push(storage.setup());

    // loads all images
    promises.push(loadImages().catch(function (error) {
        // Well, that's life. Hopefully everything still works without images.
        console.error(error);
    }));

    // once everything is loaded and initialized, let the user proceed
    Promise.all(promises).then(function() {
        var $screen = $('#splash-screen');
        $screen.click(function () {
            $screen.hide();
            if (decks.getSelectedDeck() == null) {
                navigation.navigateTo('settings');
            } else {
                navigation.navigateTo('main-menu');
            }
        });
        $screen.find('.continue').removeClass('hidden');
        spinner.stop();
    });
})();

/**
 * Returns a promise which fulfills when all images are loaded.
 * @returns {Promise}
 */
function loadImages() {
    let promises = imagesToLoad.map(url => loadImage(url).catch(() => console.error(`failed to load ${url}`)));
    return Promise.all(promises).then(() => console.log('images loaded'));
}

/**
 * Returns a promise which fulfills when the specified image finishes loading.
 * @param {string} url
 * @returns {Promise}
 */
function loadImage(url) {
    console.log(`loading "${url}"...`);
    return new Promise(function (resolve, reject) {
        let image = new Image();
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
    });
}
