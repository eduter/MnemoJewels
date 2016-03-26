import time from './time'

/**
 * Maps internal interval IDs to actual timeout IDs.
 * @type {Object.<int, int>}
 */
var intervals = {};

/**
 * Returns a random integer in the interval [0, max).
 *
 * @param {int} max
 * @returns {int}
 */
function randomInt(max) {
    return (Math.floor(Math.random() * max));
}

/**
 * Randomly selects one among a list of options with different weights.
 * The probability of an option being selected is proportional to its weight.
 *
 * @param {Object.<string, number>|Array.<number>} options - a map with the weight for each option
 * @returns {string|int} - the key/index of the selected option
 */
function weighedRandom(options) {
    var option, weightSum = 0;
    for (option in options) {
        if (options.hasOwnProperty(option)) {
            weightSum += options[option];
        }
    }
    var randomNumber = Math.random();
    var accumulatedWeight = 0;
    for (option in options) {
        if (options.hasOwnProperty(option)) {
            accumulatedWeight += options[option];
            if (randomNumber < accumulatedWeight / weightSum) {
                return option;
            }
        }
    }
}

/**
 * Removes a random element from an array and returns that value.
 *
 * @param {Array} array
 * @returns {*} - the value removed from the array
 */
function randomPop(array) {
    return array.splice(randomInt(array.length), 1)[0];
}

/**
 * Calls a function repeatedly with a varying delay between calls.
 *
 * @param {function} callback - function to be called repeatedly
 * @param {function} getDelay - function which determines the delay before the next call
 * @returns {int} interval ID to be used with clearInterval
 */
function setDynamicInterval(callback, getDelay) {
    var internalIntervalId = time.now();

    function iteration() {
        callback();
        scheduleNextIteration();
    }

    function scheduleNextIteration() {
        if (internalIntervalId in intervals) {
            intervals[internalIntervalId] = setTimeout(iteration, getDelay());
        }
    }

    intervals[internalIntervalId] = 0;
    scheduleNextIteration();

    return internalIntervalId;
}

/**
 * Cancels an interval created with setDynamicInterval.
 * @param {int} intervalId
 */
function clearInterval(intervalId) {
    if (intervalId in intervals) {
        clearTimeout(intervals[intervalId]);
        delete intervals[intervalId];
    }
}

/**
 * Creates a copy of a value, so even if the copy is modified, the original remains unchanged.
 * The copy contains the same data as the original, but it's not an instance of the same class and
 * does not have any methods.
 *
 * @param {*} value
 * @return {*}
 */
function copyData(value) {
    if (value === undefined) {
        return undefined;
    } else {
        return JSON.parse(JSON.stringify(value));
    }
}

export default {
    randomInt: randomInt,
    weighedRandom: weighedRandom,
    randomPop: randomPop,
    setDynamicInterval: setDynamicInterval,
    clearInterval: clearInterval,
    copyData: copyData
};
