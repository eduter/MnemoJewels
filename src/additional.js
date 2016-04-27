// import polyfills
import 'core-js/fn/array/find';
require('es6-promise').polyfill();

import decks from './decks'
import events from './events'
import imageLoader from './imageLoader'
import navigation from './navigation'
import spinner from './spinner'
import storage from './storage'
import $ from 'jquery'

require('../stylesheet/additional.scss');


// disable native touchmove behavior to prevent overscroll
$(document).on('touchmove', event => event.preventDefault());

// handles closing browser's tab/window or navigating away from MJ
$(window).on('unload beforeunload', function() {
    events.trigger('exitApp', null, true);
});

/**
 * List of images to load before leaving the splash screen.
 * @type {string[]}
 */
let images = [
    'images/jewel.svg'
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
    var $screen = $('#splash-screen');
    $screen.click(function() {
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
