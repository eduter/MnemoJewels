/**
 * Module for handling date and time.
 */

/**
 * Number of milliseconds per unit of time.
 * WARNING: The units must be kept in most-significant to least-significant order!
 */
var TimeUnits = {
    DAY:    24 * 60 * 60 * 1000,
    HOUR:        60 * 60 * 1000,
    MINUTE:           60 * 1000,
    SECOND:                1000
};

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

/**
 * Formats a duration for display.
 * @param {int} duration - in milliseconds
 * @param {int} [unitsToPad] - minimum number of units represented in the output (e.g. 2 -> 00:00)
 * @return {string} - a string representation of the duration in the format D:HH:mm:ss
 */
function formatDuration(duration, unitsToPad) {
    unitsToPad = unitsToPad || 0;
    var minLength = unitsToPad * 2 + (unitsToPad - 1);
    var remainder = duration;
    var output = '';

    for (var unit in TimeUnits) {
        if (TimeUnits.hasOwnProperty(unit)) {
            var amount = Math.floor(remainder / TimeUnits[unit]);

            if (output !== '') {
                output += ':' + (amount < 10 ? '0' : '') + amount;
            } else if (amount > 0) {
                output += amount;
            }
            remainder -= amount * TimeUnits[unit];
        }
    }
    if (output.length < minLength) {
        output = "00:00:00:00".substr(0, minLength - output.length) + output;
    }
    return output;
}

export default {
    TimeUnits: TimeUnits,
    now: now,
    formatDate: formatDate,
    formatDuration: formatDuration
};
