mj.modules.board = (function() {
    var fmSettings = mj.settings;
    var game = null;
    var Jewel = null;
    var faJewels = [];
    var faAvailableGroupIds = [];
    
    function setup() {
        game = mj.modules.game;
        Jewel = mj.classes.Jewel;
    }
    
    function rand(piMax) {
        return (Math.floor(Math.random() * piMax));
    }
    
    function addGroup(paPairs) {
        var maFrontJewels = [];
        var maBackJewels = [];
        var miGroupId = getNextGroupId();
        
        for (var i in paPairs) {
            maFrontJewels.push(new Jewel(paPairs[i].fiPairId, miGroupId, paPairs[i].fsFront));
            maBackJewels.push(new Jewel(paPairs[i].fiPairId, miGroupId, paPairs[i].fsBack));
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
        addGroup(game.getNextGroup(fmSettings.DEFAULT_GROUP_SIZE, getPairsInUse()));
    }
    
    function getPairsInUse() {
        var maPairIds = [];
        for (var i in faJewels) {
            maPairIds.push(faJewels[i][0].fiPairId);
        }
        return maPairIds;
    }
    
    return {
        setup : setup,
        initialize : initialize,
        selectJewel : selectJewel,
        getJewels : getJewels
    };
    
})();
