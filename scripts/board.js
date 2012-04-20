mj.modules.board = (function() {
    var fmSettings = mj.settings;
    var game = null;
    var Jewel = null;
    var faJewels = [[],[]]; // array of 2 columns, each containing Jewel objects 
    var faAvailableGroupIds = [];
    var fmGroupCreationTime = {};
    var fmSelectedJewel = null;
    var fiLastSelectionTime = null;
    var fsGameMode = null;
    var fiTimer = null;
    var fiEndGameTimer = null;
    var fiClears = null;
    
    function setup() {
        game = mj.modules.game;
        Jewel = mj.classes.Jewel;
    }
    
    function initialize(psMode) {
        fsGameMode = psMode;
        faJewels = [[],[]];
        faAvailableGroupIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        fiLastSelectionTime = now();
        fmSelectedJewel = null;
        fiClears = 0;
        addDefaultGroup();
        fiTimer = window.setInterval(addDefaultGroup, fmSettings.TIME_FOR_NEXT_GROUP);
        if (psMode == '5-minutes') {
            fiEndGameTimer = window.setTimeout(function(){ gameOver(true); }, 5*60000);
        }
    }
    
    function addDefaultGroup() {
        addGroup(game.getNextGroup(fmSettings.DEFAULT_GROUP_SIZE, getPairsInUse()));
    }
    
    function getNumPairs() {
        return faJewels[0].length;
    }
    
    function getPairsInUse() {
        var maPairIds = [];
        for (var i in faJewels[0]) {
            maPairIds.push(faJewels[0][i].fiPairId);
        }
        return maPairIds;
    }
    
    function rand(piMax) {
        return (Math.floor(Math.random() * piMax));
    }
    
    function now() {
        return Date.now();
    }
    
    function addGroup(paPairs) {
        var maFrontJewels = [];
        var maBackJewels = [];
        var miGroupId = getNextGroupId();
        
        fmGroupCreationTime[miGroupId] = now();
        
        for (var i in paPairs) {
            maFrontJewels.push(new Jewel(paPairs[i].fiPairId, miGroupId, paPairs[i].fsFront));
            maBackJewels.push(new Jewel(paPairs[i].fiPairId, miGroupId, paPairs[i].fsBack));
        }
        for (var i in maFrontJewels) {
            if (getNumPairs() < fmSettings.NUM_ROWS) {
                faJewels[0].push(maFrontJewels[i]);
                faJewels[1].push(maBackJewels.splice(rand(maBackJewels.length), 1)[0]);
            } else {
                gameOver(false);
                return;
            }
        }
    }
    
    function gameOver(pbWin) {
        window.clearInterval(fiTimer);
        if (fiEndGameTimer != null) {
            window.clearTimeout(fiEndGameTimer);
        }
        game.gameOver(pbWin);
    }
    
    function getNextGroupId() {
        return faAvailableGroupIds.shift();
    }
    
    function selectJewel(piRow, piCol) {
        var miSelectionTime = now();
        
        if (piRow < faJewels[0].length) {
            if (fmSelectedJewel == null) {
                fmSelectedJewel = { row: piRow, col: piCol };
            } else {
                if (piCol == fmSelectedJewel.col) {
                    fmSelectedJewel.row = piRow;
                } else {
                    // actually trying to match a pair
                    var miPrevSelectedId = faJewels[fmSelectedJewel.col][fmSelectedJewel.row].fiPairId;
                    var miNewSelectedId = faJewels[piCol][piRow].fiPairId;
                    
                    if (miNewSelectedId == miPrevSelectedId) {
                        match(miNewSelectedId, miSelectionTime);
                    } else {
                        mismatch(miNewSelectedId, miPrevSelectedId, miSelectionTime);
                    }
                    fmSelectedJewel = null;
                }
            }
        } else {
            fmSelectedJewel = null;
        }
    }
    
    function match(piPairId, piSelectionTime) {
        var miGroupId = getGroup(piPairId);
        var maPairsInGroup = getPairsInGroup(miGroupId);
        var miThinkingTime = piSelectionTime -  Math.max(fiLastSelectionTime, fmGroupCreationTime[miGroupId]);
        
        removePair(piPairId);
        fiLastSelectionTime = piSelectionTime;
        game.rescheduleMatch(piPairId, maPairsInGroup, miThinkingTime);
        if (maPairsInGroup.length == 1) {
            faAvailableGroupIds.push(miGroupId);
        }
        
        if (getNumPairs() == 0) {
            fiClears++;
            if (fsGameMode == '10-clears' && fiClears == 10) {
                gameOver(true);
                return;
            }
            window.clearInterval(fiTimer);
            addDefaultGroup();
            fiTimer = window.setInterval(addDefaultGroup, fmSettings.TIME_FOR_NEXT_GROUP);
        }
    }
    
    function mismatch(piPairId1, piPairId2, piSelectionTime) {
        var miGroup1 = getGroup(piPairId1);
        var miGroup2 = getGroup(piPairId2);
        var miThinkingTime = piSelectionTime - Math.max(
                fiLastSelectionTime,
                Math.min(fmGroupCreationTime[miGroup1] , fmGroupCreationTime[miGroup2])
        );
        var maPairsInGroup = getPairsInGroup(miGroup1);
        
        removeGroup(miGroup1);
        if (miGroup1 != miGroup2) {
            maPairsInGroup = maPairsInGroup.concat(getPairsInGroup(miGroup2));
            removeGroup(miGroup2);
        }
        addGroup(game.getNextGroup(maPairsInGroup.length + 1));
        
        fiLastSelectionTime = piSelectionTime;
        game.rescheduleMismatch([piPairId1, piPairId2], maPairsInGroup, miThinkingTime);
    }
    
    function getGroup(piPairId) {
        for (var i in faJewels[0]) {
            if (faJewels[0][i].fiPairId == piPairId) {
                return faJewels[0][i].fiGroupId;
            }
        }
    }
    
    function getPairsInGroup(piGroupId) {
        var maPairs = [];
        
        for (var i in faJewels[0]) {
            var moJewel = faJewels[0][i];
            if (moJewel.fiGroupId == piGroupId) {
                maPairs.push(moJewel.fiPairId);
            }
        }
        return maPairs;
    }
    
    function removePair(piPairId) {
        for (var j in faJewels) {
            for (var i in faJewels[j]) {
                if (faJewels[j][i].fiPairId == piPairId) {
                    faJewels[j].splice(i, 1);
                    break;
                }
            }
        }
    }
    
    function removeGroup(piGroupId) {
        for (var j in faJewels) {
            for (var i = faJewels[j].length; i > 0; i--) {
                if (faJewels[j][i - 1].fiGroupId == piGroupId) {
                    faJewels[j].splice(i - 1, 1);
                }
            }
        }
        faAvailableGroupIds.push(piGroupId);
    }
    
    function getJewels() {
        // FIXME: should return a copy
        return faJewels;
    }
    
    function getSelectedJewel() {
        return fmSelectedJewel;
    }
    
    return {
        setup : setup,
        initialize : initialize,
        selectJewel : selectJewel,
        getJewels : getJewels,
        getSelectedJewel : getSelectedJewel
    };
})();
