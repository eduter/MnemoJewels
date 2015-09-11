mj.modules.utils = (function() {

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

    return {
        weighedRandom: weighedRandom
    };
})();
