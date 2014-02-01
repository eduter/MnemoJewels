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
            this.fdLastRep = pxIdOrRow['dLastRep'];
            this.fdNextRep = pxIdOrRow['dNextRep'];
            this.ffEasiness = pxIdOrRow['fEasiness'];
            this.fiState = pxIdOrRow['iState'];
        } else {
            this.fiPairId = pxIdOrRow;
            this.fsFront = psFront;
            this.fsBack = psBack;
            this.fdLastRep = pdLastRep;
            this.fdNextRep = pdNextRep;
            this.ffEasiness = pfEasiness;
            this.fiState = piState;
        }
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

    function pad(s, length) {
        return s + '                                                                                      '.substr(0, Math.max(0, length - s.length));
    }

    Pair.prototype.toString = function() {
        return this.fiPairId
            + '  ' + dateToStr(this.fdLastRep)
            + '  ' + dateToStr(this.fdNextRep)
            + '  ' + this.fiState
            + '  ' + pad(this.fsFront, 15)
            + '  ' + pad(this.fsBack, 15);
    };

    mj.classes = {
        Jewel : Jewel,
        Pair : Pair
    };
})();

