mj.dom = (function() {

    function hasClass(element, className) {
        return $(element).hasClass(className);
    }

    function addClass(element, className) {
        $(element).addClass(className);
    }

    function removeClass(element, className) {
        $(element).removeClass(className);
    }

    function bind(element, event, handler) {
        $(element).on(event, null, null, handler);
    }

    /**
     * Returns the scale factor for the whole screen.
     *
     * @return {Number}
     */
    function getScale() {
        return parseFloat(document.getElementById('top-container').style.fontSize);
    }

    return {
        $: $,
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        bind: bind,
        getScale: getScale
    };
})();
