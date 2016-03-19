var $ = require('jquery');


/**
 * Event handlers indexed by event name.
 * @type {Object.<string, Array.<function>>}
 */
var eventHandlers = {};

/**
 * One-time events which were already triggered.
 * The key is the event name and the value is the serialized event data.
 * @type {Object.<string, string>}
 */
var oneTimeEvents = {};

function setup() {
    // disable native touchmove behavior to prevent overscroll
    $(document).on('touchmove', event => event.preventDefault());

    // hide the address bar on Android devices
    if (/Android/.test(navigator.userAgent)) {
        $('html')[0].style.height = '200%';
        setTimeout(function () {
            window.scrollTo(0, 1);
        }, 0);
    }

    // handles closing browser's tab/window or navigating away from MJ
    $(window).on('unload beforeunload', function () {
        trigger('exitApp', null, true);
    });

    initializeDeckList();
    initializeAllModules();
}

/**
 * Initializes all modules and triggers the initialize event for each.
 */
function initializeAllModules() {
    var modules = {
        board: require('./board').default,
        cards: require('./cards').default,
        decks: require('./decks').default,
        display: require('./display').default,
        game: require('./game').default,
        score: require('./score').default,
        storage: require('./storage').default,
        time: require('./time').default,
        utils: require('./utils').default
    };
    for (var moduleName in modules) {
        if (moduleName != 'main' && modules.hasOwnProperty(moduleName)) {
            if (typeof modules[moduleName].setup == 'function') {
                modules[moduleName].setup();
            }
            trigger('initialize-' + moduleName, null, true);
        }
    }
    window.mj.modules = modules;
}

function initializeDeckList() {
    window.mj.decks = [
        require('../decks/top-no-en.json'),
        require('../decks/top-pt_BR-en.json'),
        require('../decks/top-sv-en.json')
    ];
}

/**
 * Attach an event handler to an event.
 *
 * @param {string} eventName - name of the event the event handler will be attached to
 * @param {function} eventHandler - function to be called when the event is triggered
 */
function bind(eventName, eventHandler) {
    if (eventName in oneTimeEvents) {
        notifyHandler(eventHandler, oneTimeEvents[eventName]);
    } else {
        eventHandlers[eventName] = eventHandlers[eventName] || [];
        eventHandlers[eventName].push(eventHandler);
    }
}

/**
 * Triggers an event and notifies all handlers attached to it.
 *
 * @param {string} eventName - name of the event to be triggered
 * @param {*} [eventData=null] - an "immutable" copy of this is passed to the event handlers
 * @param {boolean} [oneTimeEvent=false] - indicates whether this event is a one-time thing (i.e. handlers registered after the event will be executed immediately)
 */
function trigger(eventName, eventData, oneTimeEvent) {
    if (oneTimeEvent) {
        if (!(eventName in oneTimeEvents)) {
            oneTimeEvents[eventName] = serializeEventData(eventData);
            notifyHandlers(eventName, eventData);
            delete eventHandlers[eventName];
        }
    } else {
        notifyHandlers(eventName, eventData);
    }
}

/**
 * Convenience method to trigger a callback once all (one-time) events from a list are triggered.
 *
 * @param {Array.<string>} events - the names of all events to wait for
 * @param {function} callback
 */
function waitFor(events, callback) {
    var stillWaitingFor = events.slice();

    for (var i = 0; i < events.length; i++) {
        bind(events[i], (function (eventName) {
            return function () {
                var index = stillWaitingFor.indexOf(eventName);
                if (index >= 0) {
                    stillWaitingFor.splice(index, 1);
                    if (stillWaitingFor.length == 0) {
                        callback();
                    }
                }
            };
        })(events[i]));
    }
}

/**
 * Notifies all handlers attached to an event.
 *
 * @param {string} eventName - name of the event being triggered
 * @param {*} [eventData=null] - an "immutable" copy of this is passed to the event handlers
 */
function notifyHandlers(eventName, eventData) {
    if (eventName in eventHandlers) {
        var serializedData = serializeEventData(eventData);
        for (var i = 0; i < eventHandlers[eventName].length; i++) {
            notifyHandler(eventHandlers[eventName][i], serializedData);
        }
    }
}

/**
 * Notifies one handler of the event it is attached to.
 *
 * @param {function} handler
 * @param {string} serializedEventData
 */
function notifyHandler(handler, serializedEventData) {
    handler.call(null, JSON.parse(serializedEventData));
}

/**
 * Serializes the data to be passed to the event handlers.
 *
 * @param {*} eventData
 * @return {string}
 */
function serializeEventData(eventData) {
    return (eventData === undefined ? 'null' : JSON.stringify(eventData));
}


export default {
    setup: setup,
    bind: bind,
    trigger: trigger,
    waitFor: waitFor
};
