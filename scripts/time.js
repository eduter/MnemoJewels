/**
 * Module for handling date and time.
 */
mj.modules.time = (function() {

    /**
     * @typedef {int} timestamp
     */

    /**
     * Returns the current timestamp.
     * @return {timestamp}
     */
    function now() {
        return Date.now();
    }

    /**
     * Formats a date for display.
     * @param {Date} date
     * @return {string} - a string representation of the date in the format YYYY-MM-DD HH:mm:ss
     */
    function formatDate(date) {
        return new Date(date).toISOString().replace(/\.[\dZ]+/, '').replace('T', ' ');
    }

    return {
        now: now,
        formatDate: formatDate
    };
})();
