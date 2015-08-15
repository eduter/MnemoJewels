(function(){

    function Jewel(piGroupId, poPair, pbIsFront) {
        this.fiGroupId = piGroupId;
        this.foPair = poPair;
        this.fbIsFront = pbIsFront;
    }

    Jewel.prototype.getText = function() {
        if (this.fbIsFront) {
            return this.foPair.fsFront;
        } else {
            return this.foPair.fsBack;
        }
    };

    function Pair(pxIdOrRow, psFront, psBack, pdLastRep, pdNextRep, pfEasiness, piState) {
        if (arguments.length == 1) {
            this.fiPairId = pxIdOrRow['id'];
            this.fsFront = pxIdOrRow['sFront'];
            this.fsBack = pxIdOrRow['sBack'];
            this.ffEasiness = pxIdOrRow['fEasiness'];
            this.fiState = pxIdOrRow['iState'];
            this.setSchedule(pxIdOrRow['dLastRep'], pxIdOrRow['dNextRep']);
        } else {
            this.fiPairId = pxIdOrRow;
            this.fsFront = psFront;
            this.fsBack = psBack;
            this.ffEasiness = pfEasiness;
            this.fiState = piState;
            this.setSchedule(pdLastRep, pdNextRep);
        }
        this.suspendedUntil = null;
    }

    function dateToStr(date) {
        if (date) {
            return new Date(date).toISOString().replace(/\.[\dZ]+/, '').replace('T', ' ');
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

    Pair.prototype.setSchedule = function(lastRep, nextRep) {
        this.fdLastRep = lastRep;
        this.fdNextRep = nextRep;
        if (lastRep && nextRep) {
            this.relativeScheduling = (Date.now() - nextRep) / (nextRep - lastRep);
        } else {
            this.relativeScheduling = null;
        }
    };

    Pair.prototype.toString = function() {
        return pad(this.fiPairId, 4)
            + '  ' + dateToStr(this.fdLastRep)
            + '  ' + dateToStr(this.fdNextRep)
            + '  ' + this.fiState
            + '  ' + pad(this.fsFront, 15)
            + '  ' + pad(this.fsBack, 15);
    };

    /**
     * Checks whether this pair is currently suspended.
     * @returns {boolean}
     */
    Pair.prototype.isSuspended = function() {
        return (this.suspendedUntil != null&& this.suspendedUntil > Date.now());
    };

    /**
     * Suspends this pair until the specified time.
     * @param {number} endSuspension - Timestamp of when the suspension is over
     */
    Pair.prototype.suspend = function(endSuspension) {
        this.suspendedUntil = endSuspension;
    };

    mj.classes = {
        Jewel : Jewel,
        Pair : Pair
    };
})();

