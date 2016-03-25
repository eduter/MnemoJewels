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
    $(window).on('unload beforeunload', () => events.trigger('exitApp', null, true));

    // initializes the storage
    storage.setup();

    // After all images are loaded, let the user proceed
    loadImages().catch(function (error) {
        // Well, that's life. Hopefully everything still works without images.
        console.error(error);
    }).then(function() {
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
    return Promise.all(imagesToLoad.map(loadImage));
}

/**
 * Returns a promise which fulfills when the specified image finishes loading.
 * @param {string} url
 * @returns {Promise}
 */
function loadImage(url) {
    return new Promise(function (resolve, reject) {
        var req = new XMLHttpRequest();

        req.open('GET', url);
        req.onload = function () {
            if (req.status == 200) {
                resolve(req.response);
            } else {
                reject(Error(`${req.status}: Failed to load image "${url}"`));
            }
        };
        req.onerror = function () {
            reject(Error(`Failed to load image "${url}" due to network problems`));
        };
        req.send();
    });
}
