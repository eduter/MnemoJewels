/**
 * A Jewel represents one of the pieces from the board, containing either the front or the back of a card.
 *
 * @param {int} groupId - the id of the group this jewel belongs to
 * @param {Card} card - the card this jewel represents one side of
 * @param {boolean} isFront - true if this jewel represents the front of the card, or false for the back
 * @constructor
 */
function Jewel(groupId, card, isFront) {
    this.groupId = groupId;
    this.card = card;
    this.isFront = isFront;
}

/**
 * Gets the text this jewel contains.
 * @returns {string}
 */
Jewel.prototype.getText = function() {
    return (this.isFront ? this.card.front : this.card.back);
};

export default Jewel;
