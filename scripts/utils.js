mj.modules.utils = (function() {

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
     * The probability of a choice being selected is proportional to its weight.
     *
     * @param {Array.<number>} weights - a list of weights (one for each possible choice)
     * @returns {int} - the index of the selected choice
     */
    function weighedRandom(weights) {
        var weightSum = 0;
        for (var w = 0; w < weights.length; w++) {
            weightSum += weights[w];
        }
        var randomNumber = Math.random();
        var accumulatedWeight = 0;
        for (var i = 0; i < weights.length; i++) {
            accumulatedWeight += weights[i] / weightSum;
            if (randomNumber < accumulatedWeight) {
                return i;
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

    return {
        randomInt: randomInt,
        weighedRandom: weighedRandom,
        randomPop: randomPop
    };
})();
