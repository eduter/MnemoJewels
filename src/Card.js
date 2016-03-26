import time from './time'
import States from './States'

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
 * @param {boolean} [isMismatched] - indicates if the last time it was presented, the user mismatched it
 * @constructor
 */
function Card(id, front, back, lastRep, nextRep, easiness, state, isMismatched) {
    this.id = id;
    this.front = front;
    this.back = back;
    this.setSchedule(lastRep || null, nextRep || null);
    this.easiness = easiness || 2.5;
    this.state = state || 1;
    this.suspendedUntil = null;
    this.isMismatched = (isMismatched === undefined ? defaultIsMismatchedValue(this.state) : isMismatched);
}

Card.unserialize = function(id, cardData) {
    return new Card(
        id,
        cardData['ft'],
        cardData['bk'],
        cardData['lr'],
        cardData['nr'],
        cardData['ea'],
        cardData['st'],
        cardData['ms']
    );
};

Card.prototype.serialize = function() {
    var obj = {
        ft: this.front,
        bk: this.back,
        ea: this.easiness,
        st: this.state,
        lr: this.lastRep,
        nr: this.nextRep
    };
    if (this.isMismatched != defaultIsMismatchedValue(this.state)) {
        obj.ms = this.isMismatched;
    }
    return obj;
};

/**
 * Gets the default value for isMismatched for a given card state.
 * @param {State} cardState
 * @return {boolean}
 */
function defaultIsMismatchedValue(cardState) {
    return (cardState == States.LAPSE);
}

function dateToStr(date) {
    if (date) {
        return time.formatDate(date);
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
        this.relativeScheduling = (time.now() - nextRep) / (nextRep - lastRep);
    } else {
        this.relativeScheduling = null;
    }
};

/**
 * Marks the card as matched and updates its state, if necessary.
 */
Card.prototype.match = function() {
    this.isMismatched = false;
    if (this.state == States.NEW) {
        this.state = States.LEARNING;
    } else {
        this.state = States.KNOWN;
    }
};

/**
 * Marks the card as mismatched and updates its state, if necessary.
 */
Card.prototype.mismatch = function() {
    this.isMismatched = true;
    if (this.state == States.NEW || this.state == States.LEARNING) {
        this.state = States.NEW;
    } else {
        this.state = States.LAPSE;
    }
};

Card.prototype.toString = function() {
    return pad(this.id, 4)
        + '  ' + dateToStr(this.lastRep)
        + '  ' + dateToStr(this.nextRep)
        + '  ' + this.state
        + '  ' + (this.isMismatched ? 'T' : 'F')
        + '  ' + pad(this.front, 15)
        + '  ' + pad(this.back, 15);
};

/**
 * Checks whether this card is currently suspended.
 * @returns {boolean}
 */
Card.prototype.isSuspended = function() {
    return (this.suspendedUntil != null&& this.suspendedUntil > time.now());
};

/**
 * Suspends this card until the specified time.
 * @param {number} endSuspension - Timestamp of when the suspension is over
 */
Card.prototype.suspend = function(endSuspension) {
    this.suspendedUntil = endSuspension;
};

export default Card;