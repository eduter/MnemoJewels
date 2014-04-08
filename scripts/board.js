mj.modules.board = (function() {
    var fmSettings = mj.settings;
    var dom, game, Jewel, overlay;
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
    var gameRunning = false;

    function setup() {
        dom = mj.dom;
        game = mj.modules.game;
        Jewel = mj.classes.Jewel;
        overlay = dom.$('#overlay')[0];
    }
    
    function initialize(psMode) {
        fsGameMode = psMode;
        gameRunning = true;
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
        var i;
        
        fmGroupCreationTime[miGroupId] = now();
        
        for (i = 0; i < paPairs.length; i++) {
            var moPair = paPairs[i];
            fmPairsInUse[moPair.fiPairId] = moPair;
            maFrontJewels.push(new Jewel(miGroupId, moPair, true));
            maBackJewels.push(new Jewel(miGroupId, moPair, false));
        }
        while (maFrontJewels.length) {
            if (getNumPairs() < fmSettings.NUM_ROWS) {
                faJewels[0].push(maFrontJewels.splice(rand(maFrontJewels.length), 1)[0]);
                faJewels[1].push(maBackJewels.splice(rand(maBackJewels.length), 1)[0]);
            } else {
                gameOver(false);
                return;
            }
        }
    }
    
    function gameOver(pbWin) {
        gameRunning = false;
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
            } else if (piCol == fmSelectedJewel.col) {
                fmSelectedJewel.row = piRow;
            } else {
                var prevSelectedJewel = faJewels[fmSelectedJewel.col][fmSelectedJewel.row];
                var newSelectedJewel = faJewels[piCol][piRow];

                if (prevSelectedJewel.fiGroupId == newSelectedJewel.fiGroupId) {
                    // actually trying to match a pair
                    var miPrevSelectedId = prevSelectedJewel.foPair.fiPairId;
                    var miNewSelectedId = newSelectedJewel.foPair.fiPairId;

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
            clearInterval();
            game.handleBoardCleared();
            addDefaultGroup();
            setInterval();
        }
    }

    function setInterval() {

        function f() {
            addDefaultGroup();
            scheduleNextGroup(f);
        }

        scheduleNextGroup(f);
    }

    function scheduleNextGroup(f) {
        if (gameRunning) {
            fiTimer = window.setTimeout(f, game.getIntervalBetweenGroups(getNumPairs()));
        }
    }

    function clearInterval() {
        window.clearInterval(fiTimer);
    }

    function mismatch(piPairId1, piPairId2, piSelectionTime) {
        var miGroup = getGroup(piPairId1);
        var maPairsInGroup = getPairsInGroup(miGroup);
        var miThinkingTime = piSelectionTime - Math.max(fiLastSelectionTime, fmGroupCreationTime[miGroup]);

        dom.addClass(overlay, 'visible');
        setTimeout(function(){ dom.removeClass(overlay, 'visible') }, fmSettings.MISMATCH_PENALTY_TIME);

        removeGroup(miGroup);
        createNewGroup(maPairsInGroup.length);
        
        fiLastSelectionTime = piSelectionTime;
        game.rescheduleMismatch([piPairId1, piPairId2], maPairsInGroup, miThinkingTime);
    }
    
    function getGroup(piPairId) {
        for (var i = 0; i < faJewels[0].length; i++) {
            if (faJewels[0][i].foPair.fiPairId == piPairId) {
                return faJewels[0][i].fiGroupId;
            }
        }
        return null;
    }
    
    function getPairsInGroup(piGroupId) {
        var maPairs = [];

        for (var i = 0; i < faJewels[0].length; i++) {
            var moJewel = faJewels[0][i];
            if (moJewel.fiGroupId == piGroupId) {
                maPairs.push(moJewel.foPair);
            }
        }
        return maPairs;
    }
    
    function removePair(piPairId) {
        for (var j = 0; j < faJewels.length; j++) {
            for (var i = 0; i < faJewels[j].length; i++) {
                if (faJewels[j][i].foPair.fiPairId == piPairId) {
                    faJewels[j].splice(i, 1);
                    break;
                }
            }
        }
        delete fmPairsInUse[piPairId];
    }
    
    function removeGroup(piGroupId) {
        for (var j = 0; j < faJewels.length; j++) {
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
