// TODO: Having jQuery, is there any point in keeping this module?

var $ = require('jquery');

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

export default {
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    bind: bind
};
