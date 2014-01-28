
mj.classes.Jewel = function(piGroupId, poPair, pbIsFront) {
    this.fiGroupId = piGroupId;
    this.foPair = poPair;
    this.fbIsFront = pbIsFront;

    this.getText = function() {
        if (this.fbIsFront) {
            return this.foPair.fsFront;
        } else {
            return this.foPair.fsBack;
        }
    }
};

mj.classes.Pair = function(pxIdOrRow, psFront, psBack, pdLastRep, pdNextRep, pfEasiness, piState) {
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
};
