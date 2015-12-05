mj.modules.main = (function() {
    var dom = mj.dom;
    var $ = dom.$;
    var history = [];
    var currentScreen = null;

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

    function showScreen(screenId) {
        // run the screen module setup, if any
        if (mj.screens[screenId] && mj.screens[screenId].run) {
            mj.screens[screenId].run();
        }
        // display new screen
        dom.addClass(getScreen(screenId), 'active');
    }
    
    function hideScreen(screenId) {
        dom.removeClass(getScreen(screenId), 'active');
    }
    
    function getScreen(screenId) {
        return $('#' + screenId)[0];
    }
    
    function navigateTo(screenId) {
        if (currentScreen) {
            hideScreen(currentScreen);
            history.push(currentScreen);
        }
        currentScreen = screenId;
        showScreen(currentScreen);
    }
    
    function back() {
        hideScreen(currentScreen);
        currentScreen = history.pop();
        showScreen(currentScreen);
    }
    
    function setup() {
        // disable native touchmove behavior to prevent overscroll
        dom.bind(document, 'touchmove', function(event) {
            event.preventDefault();
        });

        // hide the address bar on Android devices
        if (/Android/.test(navigator.userAgent)) {
            $('html')[0].style.height = '200%';
            setTimeout(function() {
                window.scrollTo(0, 1);
            }, 0);
        }

        // handle navigation button clicks
        dom.bind('body', 'click', function(e) {
            if (e.target.nodeName.toLowerCase() === 'button') {
                if (dom.hasClass(e.target, 'back')) {
                    back();
                } else if (dom.hasClass(e.target, 'nav')) {
                    navigateTo(e.target.getAttribute('name'));
                }
            }
        });
    }

    /**
     * Initializes all modules and triggers the initialize event for each.
     */
    function initializeAllModules() {
        var modules = mj.modules;
        for (var moduleName in modules) {
            if (moduleName != 'main' && modules.hasOwnProperty(moduleName)) {
                if (typeof modules[moduleName].setup == 'function') {
                    modules[moduleName].setup();
                }
                trigger('initialize-' + moduleName, null, true);
            }
        }
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
    
    // expose public methods
    return {
        setup: setup,
        initializeAllModules: initializeAllModules,
        bind: bind,
        trigger: trigger,
        navigateTo: navigateTo
    };
})();
