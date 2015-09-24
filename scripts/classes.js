(function(){

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

    /**
     * Card constructor.
     *
     * @param {int} id
     * @param {string} front
     * @param {string} back
     * @param {timestamp} [lastRep]
     * @param {timestamp} [nextRep]
     * @param {float} [easiness]
     * @param {int} [state]
     * @constructor
     */
    function Card(id, front, back, lastRep, nextRep, easiness, state) {
        this.id = id;
        this.front = front;
        this.back = back;
        this.setSchedule(lastRep || null, nextRep || null);
        this.easiness = easiness || 2.5;
        this.state = state || 1;
        this.suspendedUntil = null;
    }

    Card.unserialize = function(id, cardData) {
        return new Card(
            id,
            cardData['ft'],
            cardData['bk'],
            cardData['lr'],
            cardData['nr'],
            cardData['ea'],
            cardData['st']
        );
    };

    Card.prototype.serialize = function() {
        return {
            ft: this.front,
            bk: this.back,
            ea: this.easiness,
            st: this.state,
            lr: this.lastRep,
            nr: this.nextRep
        };
    };

    function dateToStr(date) {
        if (date) {
            return mj.modules.time.formatDate(date);
        } else if (date === null) {
            return '               null';
        } else {
            return typeof date;
        }
    }

    function pad(v, length) {
        var padding = '                                                                                               ';
        if (typeof v == 'string') {
            return (v + padding).substr(0, length);
        } else {
            return (padding + v).substr(-length);
        }
    }

    Card.prototype.setSchedule = function(lastRep, nextRep) {
        this.lastRep = lastRep;
        this.nextRep = nextRep;
        if (lastRep && nextRep) {
            this.relativeScheduling = (mj.modules.time.now() - nextRep) / (nextRep - lastRep);
        } else {
            this.relativeScheduling = null;
        }
    };

    Card.prototype.toString = function() {
        return pad(this.id, 4)
            + '  ' + dateToStr(this.lastRep)
            + '  ' + dateToStr(this.nextRep)
            + '  ' + this.state
            + '  ' + pad(this.front, 15)
            + '  ' + pad(this.back, 15);
    };

    /**
     * Checks whether this card is currently suspended.
     * @returns {boolean}
     */
    Card.prototype.isSuspended = function() {
        return (this.suspendedUntil != null&& this.suspendedUntil > mj.modules.time.now());
    };

    /**
     * Suspends this card until the specified time.
     * @param {number} endSuspension - Timestamp of when the suspension is over
     */
    Card.prototype.suspend = function(endSuspension) {
        this.suspendedUntil = endSuspension;
    };

    mj.classes = {
        Jewel : Jewel,
        Card : Card
    };
})();

