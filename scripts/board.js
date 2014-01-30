mj.modules.board = (function() {
    var fmSettings = mj.settings;
    var game = null;
    var Jewel = null;
    var faJewels = [[],[]]; // array of 2 columns, each containing Jewel objects 
    var fmPairsInUse = {};
    var faAvailableGroupIds = [];
    var fmGroupCreationTime = {};
    var fmSelectedJewel = null;
    var fiLastSelectionTime = null;
    var fsGameMode = null;
    var fiTimer = null;
    var fiEndGameTimer = null;
    var fiClears = null;
    var waitingForDefaultGroup = false;
    
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
        setInterval();
        if (psMode == '5-minutes') {
            fiEndGameTimer = window.setTimeout(function(){ gameOver(true); }, 5*60000);
        }
    }
    
    function createNewGroup(piSize) {
        game.createNewGroup(piSize, getPairsInUse(), addGroup);
    }
    
    function addDefaultGroup() {
        if (!waitingForDefaultGroup) {
            waitingForDefaultGroup = true;
            game.createNewGroup(fmSettings.DEFAULT_GROUP_SIZE, getPairsInUse(), function(){
                addGroup.apply(this, arguments);
                waitingForDefaultGroup = false;
            });
        }
    }
    
    function getNumPairs() {
        return faJewels[0].length;
    }
    
    function getPairsInUse() {
        var maPairsInUse = [];
        for (var id in fmPairsInUse) {
            maPairsInUse.push(fmPairsInUse[id]);
        }
        return maPairsInUse;
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
            var moPair = paPairs[i];
            fmPairsInUse[moPair.fiPairId] = moPair;
            maFrontJewels.push(new Jewel(miGroupId, moPair, true));
            maBackJewels.push(new Jewel(miGroupId, moPair, false));
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
        game.updateGameSpeed(getNumPairs() - paPairs.length, getNumPairs());
    }
    
    function gameOver(pbWin) {
        clearInterval();
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
                    var miPrevSelectedId = faJewels[fmSelectedJewel.col][fmSelectedJewel.row].foPair.fiPairId;
                    var miNewSelectedId = faJewels[piCol][piRow].foPair.fiPairId;
                    
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

        game.updateGameSpeed(getNumPairs() + 1, getNumPairs());

        if (getNumPairs() == 0) {
            fiClears++;
            if (fsGameMode == '10-clears' && fiClears == 10) {
                gameOver(true);
                return;
            }
            clearInterval();
            game.handleBoardCleared();
            addDefaultGroup();
            setInterval();
        }
    }

    function setInterval() {
        function f() {
            addDefaultGroup();
            fiTimer = window.setTimeout(f, game.getIntervalBetweenGroups());
        }

        fiTimer = window.setTimeout(f, game.getIntervalBetweenGroups());
    }
    
    function clearInterval() {
        window.clearInterval(fiTimer);
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
        createNewGroup(maPairsInGroup.length + 1);
        
        fiLastSelectionTime = piSelectionTime;
        game.rescheduleMismatch([piPairId1, piPairId2], maPairsInGroup, miThinkingTime);
    }
    
    function getGroup(piPairId) {
        for (var i in faJewels[0]) {
            if (faJewels[0][i].foPair.fiPairId == piPairId) {
                return faJewels[0][i].fiGroupId;
            }
        }
    }
    
    function getPairsInGroup(piGroupId) {
        var maPairs = [];
        
        for (var i in faJewels[0]) {
            var moJewel = faJewels[0][i];
            if (moJewel.fiGroupId == piGroupId) {
                maPairs.push(moJewel.foPair);
            }
        }
        return maPairs;
    }
    
    function removePair(piPairId) {
        for (var j in faJewels) {
            for (var i in faJewels[j]) {
                if (faJewels[j][i].foPair.fiPairId == piPairId) {
                    faJewels[j].splice(i, 1);
                    break;
                }
            }
        }
        delete fmPairsInUse[piPairId];
    }
    
    function removeGroup(piGroupId) {
        for (var j in faJewels) {
            for (var i = faJewels[j].length; i > 0; i--) {
                if (faJewels[j][i - 1].fiGroupId == piGroupId) {
                    if (j == 0) {
                        delete fmPairsInUse[faJewels[j][i - 1].foPair.fiPairId];
                    }
                    faJewels[j].splice(i - 1, 1);
                }
            }
        }
        faAvailableGroupIds.push(piGroupId);
    }
    
    function getJewels() {
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
