
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

mj.classes.Pair = function(piPairId, psFront, psBack, pdLastRep, pdNextRep, pfEasiness) {
    this.fiPairId = piPairId;
    this.fsFront = psFront;
    this.fsBack = psBack;
    this.fdLastRep = pdLastRep;
    this.fdNextRep = pdNextRep;
    this.ffEasiness = pfEasiness;

    this.conflictsWith = function(poOtherPair) {
        if (poOtherPair.fiPairId == this.fiPairId) {
            return true;
        } else if (poOtherPair.fsFront == this.fsFront) {
            return true;
        } else if (poOtherPair.fsBack == this.fsBack) {
            return true;
        } else {
            return false;
        }
    };
};
