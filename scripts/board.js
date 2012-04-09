jewel.board = (function() {
    var fmSettings = jewel.settings;
    var faJewels;
    var faAvailableGroupIds;
    
    jewel.Jewel = function(piPairId, piGroupId, psText) {
        this.fiPairId = piPairId;
        this.fiGroupId = piGroupId;
        this.fsText = psText;
    }
    
    jewel.Pair = function(piPairId, psFront, psBack) {
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
        }
    }
    
    function rand(piMax) {
        return (Math.floor(Math.random() * piMax));
    }
    
    function addGroup(paPairs) {
        var maFrontJewels = [];
        var maBackJewels = [];
        var miGroupId = getNextGroupId();
        
        for (var i in paPairs) {
            maFrontJewels.push(new jewel.Jewel(paPairs[i].fiPairId, miGroupId, paPairs[i].fsFront));
            maBackJewels.push(new jewel.Jewel(paPairs[i].fiPairId, miGroupId, paPairs[i].fsBack));
        }
        for (var i in maFrontJewels) {
            faJewels.push([
                maFrontJewels[i],
                maBackJewels.splice(rand(maBackJewels.length), 1)[0]
            ]);
        }
    }
    
    function getNextGroupId() {
        return faAvailableGroupIds.shift();
    }
    
    function selectJewel(piRow, piCol) {
        // TODO
        /*
         * verifica se a jóia existe
         * 
         */
    }
    
    function getJewels() {
        // FIXME: should return a copy
        return faJewels;
    }
    
    function initialize() {
        faJewels = [];
        faAvailableGroupIds = [1, 2, 3, 4, 5, 6];
        addGroup(jewel.game.getNextGroup(fmSettings.DEFAULT_GROUP_SIZE, getPairsInUse()));
    }
    
    function getPairsInUse() {
        var maPairIds = [];
        for (var i in faJewels) {
            maPairIds.push(faJewels[i][0].fiPairId);
        }
        return maPairIds;
    }
    
    // creates a copy of the jewel board
    function getBoard() {
        var copy = [],
            x;
        for (x = 0; x < cols; x++) {
            copy[x] = jewels[x].slice(0);
        }
        return copy;
    }
    
    function print() {
        var str = "";
        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                str += getJewel(x, y) + " ";
            }
            str += "\r\n";
        }
        console.log(str);
    }
    
    return {
        initialize : initialize,
        getJewels : getJewels
    };
    
})();
