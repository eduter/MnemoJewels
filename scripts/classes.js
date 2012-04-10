
mj.classes.Jewel = function(piPairId, piGroupId, psText) {
    this.fiPairId = piPairId;
    this.fiGroupId = piGroupId;
    this.fsText = psText;
};

mj.classes.Pair = function(piPairId, psFront, psBack) {
    this.fiPairId = piPairId;
    this.fsFront = psFront;
    this.fsBack = psBack;
    
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
