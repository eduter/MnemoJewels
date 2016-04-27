
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

/**
 * Attach an event handler to an event.
 *
 * @param {string} eventName - name of the event the event handler will be attached to
 * @param {function} eventHandler - Function to be called when the event is triggered. If it is async, it must return a promise.
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
 * @returns {Promise} - a promise that fulfills once all handlers (registered so far) finish executing
 */
function trigger(eventName, eventData, oneTimeEvent) {
    if (oneTimeEvent) {
        if (!(eventName in oneTimeEvents)) {
            oneTimeEvents[eventName] = serializeEventData(eventData);
            let promise = notifyHandlers(eventName, eventData);
            delete eventHandlers[eventName];
            return promise;
        }
        return Promise.resolve();
    } else {
        return notifyHandlers(eventName, eventData);
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
 * @returns {Promise}
 */
function notifyHandlers(eventName, eventData) {
    if (eventName in eventHandlers) {
        let serializedData = serializeEventData(eventData);
        return Promise.all(eventHandlers[eventName].map(handler => notifyHandler(handler, serializedData)));
    }
    return Promise.resolve();
}

/**
 * Notifies one handler of the event it is attached to.
 *
 * @param {function} handler
 * @param {string} serializedEventData
 * @returns {Promise}
 */
function notifyHandler(handler, serializedEventData) {
    return Promise.resolve(handler.call(null, JSON.parse(serializedEventData)));
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
    bind: bind,
    trigger: trigger,
    waitFor: waitFor
};
