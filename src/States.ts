/**
 * Defines the state of a card, regarding the player's learning progress.
 * @typedef {int} State
 */

/**
 * Enumeration of possible card states.
 * @type {Object.<string, State>}
 */
var States = {
    NEW:      1, // not learned yet
    LEARNING: 2, // successfully matched at least once, but never twice in a row
    KNOWN:    3, // successfully matched at least twice in a row and last time
    LAPSE:    4  // once known, but mismatched last time
};

export default States;
