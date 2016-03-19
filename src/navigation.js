var $ = require('jquery');

/**
 * Map with all screen modules indexed by their IDs.
 * @type {Object.<string, Object>}
 */
var screens = {
    'game': require('./screen.game').default,
    'deck-stats': require('./screen.deck-stats').default,
    'top-scores': require('./screen.top-scores').default,
    'settings': require('./screen.settings').default
};

/**
 * The ID of the current screen.
 * @type {string}
 */
var currentScreen = null;

/**
 * History of the previously visited screens.
 * @type {Array.<string>}
 */
var previousScreens = [];


/**
 * Initializes the navigation module.
 */
(function setup() {
    initializeScreenModules();
    registerListeners();
})();

/**
 * Initialize the screen modules that require some initialization.
 */
function initializeScreenModules() {
    Object.keys(screens).forEach(function(screenId) {
        if (typeof (screens[screenId].setup) === 'function') {
            screens[screenId].setup();
        }
    });
}

/**
 * Register the listeners to handle navigation buttons.
 */
function registerListeners() {
    let $body = $('body');

    $body.on('click', 'button.nav', event => navigateTo(event.target.name));
    $body.on('click', 'button.back', event => back());
}

/**
 * Navigates to the specified screen.
 * @param {string} screenId
 */
function navigateTo(screenId) {
    if (screenId === currentScreen) {
        throw Error(`Cannot navigate to current screen (${screenId})`);
    } else {
        if (currentScreen) {
            hideScreen(currentScreen);
            previousScreens.push(currentScreen);
        }
        currentScreen = screenId;
        showScreen(currentScreen);
    }
}

/**
 * Navigates back to the previous screen.
 */
function back() {
    hideScreen(currentScreen);
    currentScreen = previousScreens.pop();
    showScreen(currentScreen);
}

/**
 * Hides the specified screen.
 * @param {string} screenId
 */
function hideScreen(screenId) {
    getScreen(screenId).removeClass('active');
}

/**
 * Makes the specified screen visible.
 * @param {string} screenId
 */
function showScreen(screenId) {
    // updates the screen, if necessary
    if (screens[screenId] && typeof(screens[screenId].update) == 'function') {
        screens[screenId].update();
    }
    // makes the screen visible
    getScreen(screenId).addClass('active');
}

/**
 * Returns the screen with the specified ID.
 *
 * @param {string} screenId
 * @returns {jQuery} element representing the screen
 */
function getScreen(screenId) {
    return $('#' + screenId);
}


export default {
    navigateTo: navigateTo
}
