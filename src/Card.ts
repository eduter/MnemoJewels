import time from './time'
import States from './States'

/**
 * Represents one flashcard.
 */
class Card {

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
     */
    constructor(id, front, back, lastRep, nextRep, easiness, state, isMismatched) {
        this.id = id;
        this.front = front;
        this.back = back;
        this.setSchedule(lastRep || null, nextRep || null);
        this.easiness = easiness || 2.5;
        this.state = state || States.NEW;
        this.suspendedUntil = null;
        this.isMismatched = (isMismatched === undefined ? defaultIsMismatchedValue(this.state) : isMismatched);
    }

    /**
     * Data transfer object containing a shorter representation of a card, better for serialization and storage.
     * @typedef {{ft: string, bk: string, ea: float, st: State, lr: timestamp, nr: timestamp}} CardDto
     */

    /**
     *
     * @param {int} id
     * @param {CardDto} cardDto
     * @returns {Card}
     */
    static unserialize(id, cardDto) {
        return new Card(
            id,
            cardDto['ft'],
            cardDto['bk'],
            cardDto['lr'],
            cardDto['nr'],
            cardDto['ea'],
            cardDto['st'],
            cardDto['ms']
        );
    }

    /**
     *
     * @returns {CardDto}
     */
    serialize() {
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
    }

    /**
     * Reschedules the card for reviewing.
     *
     * @param {timestamp|null} lastRep - when the last repetition happened
     * @param {timestamp|null} nextRep - when the next repetition should ideally happen
     */
    setSchedule(lastRep, nextRep) {
        this.lastRep = lastRep;
        this.nextRep = nextRep;
        if (lastRep && nextRep) {
            this.relativeScheduling = (time.now() - nextRep) / (nextRep - lastRep);
        } else {
            this.relativeScheduling = null;
        }
    }

    /**
     * Marks the card as matched and updates its state, if necessary.
     */
    match() {
        this.isMismatched = false;
        if (this.state == States.NEW) {
            this.state = States.LEARNING;
        } else {
            this.state = States.KNOWN;
        }
    }

    /**
     * Marks the card as mismatched and updates its state, if necessary.
     */
    mismatch() {
        this.isMismatched = true;
        if (this.state == States.NEW || this.state == States.LEARNING) {
            this.state = States.NEW;
        } else {
            this.state = States.LAPSE;
        }
    }

    /**
     * Checks whether this card is currently suspended.
     * @returns {boolean}
     */
    isSuspended() {
        return (this.suspendedUntil != null && this.suspendedUntil > time.now());
    }

    /**
     * Suspends this card until the specified time.
     * @param {timestamp} endSuspension - Timestamp of when the suspension is over
     */
    suspend(endSuspension) {
        this.suspendedUntil = endSuspension;
    }

    /**
     * Returns a fixed-length string representation of its data.
     * @returns {string}
     */
    toString() {
        return pad(this.id, 4)
            + '  ' + dateToStr(this.lastRep)
            + '  ' + dateToStr(this.nextRep)
            + '  ' + this.state
            + '  ' + (this.isMismatched ? 'T' : 'F')
            + '  ' + pad(this.front, 15)
            + '  ' + pad(this.back, 15);
    }

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

/**
 * Gets the default value for isMismatched for a given card state.
 * @param {State} cardState
 * @return {boolean}
 */
function defaultIsMismatchedValue(cardState) {
    return (cardState == States.LAPSE);
}

export default Card;
