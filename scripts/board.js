mj.modules.board = (function() {
    var settings = mj.settings;
    var dom, game, cards, Jewel, overlay;
    var faJewels = [[],[]]; // array of 2 columns, each containing Jewel objects 
    var fmPairsInUse = {};
    var faAvailableGroupIds = [];
    var fmGroupCreationTime = {};
    var fmSelectedJewel = null;
    var fiLastSelectionTime = null;
    var fiTimer = null;
    var gameRunning = false;

    function setup() {
        dom = mj.dom;
        game = mj.modules.game;
        cards = mj.modules.cards;
        Jewel = mj.classes.Jewel;
        overlay = dom.$('#overlay')[0];
    }
    
    function initialize() {
        gameRunning = true;
        faJewels = [[],[]];
        faAvailableGroupIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        fiLastSelectionTime = now();
        fmSelectedJewel = null;
        addDefaultGroup();
        setInterval();
    }

    /**
     * Adds a new group to the board.
     *
     * @param {int} groupSize - the number of cards the new group should have
     */
    function createNewGroup(groupSize) {
        var newGroup = cards.createNewGroup(groupSize, getPairsInUse());
        addGroup(newGroup);
    }

    /**
     * Adds a new group to the board, containing the default number of cards.
     */
    function addDefaultGroup() {
        createNewGroup(settings.DEFAULT_GROUP_SIZE);
    }
    
    function getNumPairs() {
        return faJewels[0].length;
    }
    
    function getPairsInUse() {
        var maPairsInUse = [];
        for (var id in fmPairsInUse) {
            if (fmPairsInUse.hasOwnProperty(id)) {
                maPairsInUse.push(fmPairsInUse[id]);
            }
        }
        return maPairsInUse;
    }
    
    function rand(piMax) {
        return (Math.floor(Math.random() * piMax));
    }
    
    function now() {
        return Date.now();
    }

    /**
     * Adds a group of cards to the board.
     *
     * @param {Array.<Card>} cards
     */
    function addGroup(cards) {
        var frontJewels = [];
        var backJewels = [];
        var groupId = getNextGroupId();
        var i;
        
        fmGroupCreationTime[groupId] = now();
        
        for (i = 0; i < cards.length; i++) {
            var card = cards[i];
            fmPairsInUse[card.id] = card;
            frontJewels.push(new Jewel(groupId, card, true));
            backJewels.push(new Jewel(groupId, card, false));
        }
        while (frontJewels.length) {
            if (getNumPairs() < settings.NUM_ROWS) {
                faJewels[0].push(frontJewels.splice(rand(frontJewels.length), 1)[0]);
                faJewels[1].push(backJewels.splice(rand(backJewels.length), 1)[0]);
            } else {
                gameOver();
                return;
            }
        }
    }
    
    function gameOver() {
        gameRunning = false;
        clearInterval();
        game.gameOver();
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
                    var miPrevSelectedId = prevSelectedJewel.foPair.id;
                    var miNewSelectedId = newSelectedJewel.foPair.id;

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

    /**
     * Process a successful match between front and back of a card.
     *
     * @param {int} cardId
     * @param {timestamp} selectionTime - time at which the match was made
     */
    function match(cardId, selectionTime) {
        var groupId = getGroup(cardId);
        var cardsInGroup = getCardsInGroup(groupId);
        var thinkingTime = selectionTime -  Math.max(fiLastSelectionTime, fmGroupCreationTime[groupId]);

        removePair(cardId);
        fiLastSelectionTime = selectionTime;
        mj.modules.main.trigger('match', {
            cardId: cardId,
            cardsInGroup: cardsInGroup,
            thinkingTime: thinkingTime
        });
        if (cardsInGroup.length == 1) {
            faAvailableGroupIds.push(groupId);
        }

        if (getNumPairs() == 0) {
            clearInterval();
            addDefaultGroup();
            setInterval();
        }
    }

    /**
     * Process a mismatch between front and back of two different cards.
     *
     * @param {int} cardId1
     * @param {int} cardId2
     * @param {timestamp} selectionTime - time at which the mismatch was made
     */
    function mismatch(cardId1, cardId2, selectionTime) {
        var groupId = getGroup(cardId1);
        var cardsInGroup = getCardsInGroup(groupId);
        var thinkingTime = selectionTime - Math.max(fiLastSelectionTime, fmGroupCreationTime[groupId]);

        dom.addClass(overlay, 'visible');
        setTimeout(function(){ dom.removeClass(overlay, 'visible') }, settings.MISMATCH_PENALTY_TIME);

        removeGroup(groupId);
        createNewGroup(cardsInGroup.length);

        fiLastSelectionTime = selectionTime;
        mj.modules.main.trigger('mismatch', {
            mismatchedCards: [cardId1, cardId2],
            cardsInGroup: cardsInGroup,
            thinkingTime: thinkingTime
        });
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

    function getGroup(piPairId) {
        for (var i = 0; i < faJewels[0].length; i++) {
            if (faJewels[0][i].foPair.id == piPairId) {
                return faJewels[0][i].fiGroupId;
            }
        }
        return null;
    }
    
    function getCardsInGroup(piGroupId) {
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
                if (faJewels[j][i].foPair.id == piPairId) {
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
                        delete fmPairsInUse[faJewels[j][i - 1].foPair.id];
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
