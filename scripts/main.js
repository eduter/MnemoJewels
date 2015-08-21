mj.modules.main = (function() {
    var dom = mj.dom;
    var $ = dom.$;
    var history = [];
    var currentScreen = null;
    var fbFirstRun = true;

    /**
     * Event handlers indexed by event name.
     * @type {Object.<string, Array.<function>>}
     */
    var eventHandlers = {};

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
        if (fbFirstRun) {
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
            
            fbFirstRun = false;
        }
    }

    /**
     * Attach an event handler to an event.
     *
     * @param {string} eventName - name of the event the event handler will be attached to
     * @param {function} eventHandler - function to be called when the event is triggered
     */
    function bind(eventName, eventHandler) {
        eventHandlers[eventName] = eventHandlers[eventName] || [];
        eventHandlers[eventName].push(eventHandler);
    }

    /**
     * Triggers an event and notifies all handlers attached to it.
     *
     * @param {string} eventName - name of the event to be triggered
     * @param {*} [eventData] - data to be forwarded to the event handlers
     */
    function trigger(eventName, eventData) {
        if (eventHandlers[eventName]) {
            for (var i = 0; i < eventHandlers[eventName].length; i++) {
                eventHandlers[eventName][i].call(null, eventData);
            }
        }
    }
    
    // expose public methods
    return {
        setup : setup,
        navigateTo : navigateTo,
        bind : bind,
        trigger : trigger
    };
})();
