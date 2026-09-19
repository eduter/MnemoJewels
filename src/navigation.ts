import gameScreen from './screen.game'
import deckStatsScreen from './screen.deck-stats'
import topScoresScreen from './screen.top-scores'
import settingsScreen from './screen.settings'

/**
 * Map with all screen modules indexed by their IDs.
 * @type {Object.<string, Object>}
 */
var screens = {
    'game': gameScreen,
    'deck-stats': deckStatsScreen,
    'top-scores': topScoresScreen,
    'settings': settingsScreen
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
    document.body.addEventListener('click', event => {
        var navButton = event.target.closest('button.nav');
        if (navButton) {
            navigateTo(navButton.name);
            return;
        }
        var backButton = event.target.closest('button.back');
        if (backButton) {
            back();
        }
    });
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
    getScreen(screenId).classList.remove('active');
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
    getScreen(screenId).classList.add('active');
}

/**
 * Returns the screen with the specified ID.
 *
 * @param {string} screenId
 * @returns {HTMLElement} element representing the screen
 */
function getScreen(screenId) {
    return document.getElementById(screenId);
}


export default {
    navigateTo: navigateTo
}
