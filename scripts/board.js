mj.modules.board = (function() {

    // Aliases
    var settings, dom, game, cards, utils, Jewel;

    // TODO: this doesn't belong in this module
    var overlay = null;

    var faJewels = [[],[]]; // array of 2 columns, each containing Jewel objects 
    var faAvailableGroupIds = [];
    var fmGroupCreationTime = {};
    var fmSelectedJewel = null;
    var fiLastSelectionTime = null;

    /**
     * ID of the interval for adding new groups.
     * @type {number}
     */
    var intervalId = null;

    /**
     * Module setup.
     */
    function setup() {
        settings = mj.settings;
        dom = mj.dom;
        game = mj.modules.game;
        cards = mj.modules.cards;
        utils = mj.modules.utils;
        Jewel = mj.classes.Jewel;
        overlay = dom.$('#overlay')[0];
    }

    /**
     * Initializes the board for a new game.
     */
    function initialize() {
        faJewels = [[],[]];
        faAvailableGroupIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        fiLastSelectionTime = now();
        fmSelectedJewel = null;
        addDefaultGroup();
        startAddingGroups();
    }

    /**
     * Adds a new group to the board.
     *
     * @param {int} groupSize - the number of cards the new group should have
     */
    function addNewGroup(groupSize) {
        var newGroup = cards.createNewGroup(groupSize, getCardsInUse());
        addGroup(newGroup);
    }

    /**
     * Adds a new group to the board, containing the default number of cards.
     */
    function addDefaultGroup() {
        addNewGroup(settings.DEFAULT_GROUP_SIZE);
    }

    /**
     * Gets the number of cards currently on the board.
     * @returns {int}
     */
    function getNumCards() {
        return faJewels[0].length;
    }

    /**
     * Gets the cards currently on the board.
     * @returns {Array.<Card>}
     */
    function getCardsInUse() {
        var cards = [];
        var frontJewels = faJewels[0];
        for (var i = 0; i < frontJewels.length; i++) {
            cards.push(frontJewels[i].card);
        }
        return cards;
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
            frontJewels.push(new Jewel(groupId, card, true));
            backJewels.push(new Jewel(groupId, card, false));
        }
        while (frontJewels.length) {
            if (getNumCards() < settings.NUM_ROWS) {
                faJewels[0].push(utils.randomPop(frontJewels));
                faJewels[1].push(utils.randomPop(backJewels));
            } else {
                gameOver();
                return;
            }
        }
    }
    
    function gameOver() {
        stopAddingGroups();
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

                if (prevSelectedJewel.groupId == newSelectedJewel.groupId) {
                    // actually trying to match a card
                    var miPrevSelectedId = prevSelectedJewel.card.id;
                    var miNewSelectedId = newSelectedJewel.card.id;

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

        removeCard(cardId);
        fiLastSelectionTime = selectionTime;
        mj.modules.main.trigger('match', {
            cardId: cardId,
            cardsInGroup: cardsInGroup,
            thinkingTime: thinkingTime
        });
        if (cardsInGroup.length == 1) {
            faAvailableGroupIds.push(groupId);
        }

        if (getNumCards() == 0) {
            stopAddingGroups();
            addDefaultGroup();
            startAddingGroups();
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
        addNewGroup(cardsInGroup.length);

        fiLastSelectionTime = selectionTime;
        mj.modules.main.trigger('mismatch', {
            mismatchedCards: [cardId1, cardId2],
            cardsInGroup: cardsInGroup,
            thinkingTime: thinkingTime
        });
    }

    /**
     * Start periodically adding new groups.
     */
    function startAddingGroups() {
        intervalId = utils.setDynamicInterval(addDefaultGroup, getIntervalBetweenGroups);
    }

    /**
     * Stop periodically adding new groups.
     */
    function stopAddingGroups() {
        utils.clearInterval(intervalId);
    }

    /**
     * Calculates the time to wait to add a new group.
     * @return {int} - milliseconds to wait
     */
    function getIntervalBetweenGroups() {
        return game.getIntervalBetweenGroups(getNumCards());
    }

    /**
     * Gets the id of the group the specified card belongs to.
     *
     * @param {int} cardId
     * @returns {int|null} - the id of the group or null, if the card is not on the board
     */
    function getGroup(cardId) {
        for (var i = 0; i < faJewels[0].length; i++) {
            if (faJewels[0][i].card.id == cardId) {
                return faJewels[0][i].groupId;
            }
        }
        return null;
    }

    /**
     * Gets all cards from the specified group.
     *
     * @param {int} groupId
     * @returns {Array.<Card>}
     */
    function getCardsInGroup(groupId) {
        var cards = [];

        for (var i = 0; i < faJewels[0].length; i++) {
            var jewel = faJewels[0][i];
            if (jewel.groupId == groupId) {
                cards.push(jewel.card);
            }
        }
        return cards;
    }

    /**
     * Removes the specified card from the board.
     * @param {int} cardId
     */
    function removeCard(cardId) {
        for (var j = 0; j < faJewels.length; j++) {
            for (var i = 0; i < faJewels[j].length; i++) {
                if (faJewels[j][i].card.id == cardId) {
                    faJewels[j].splice(i, 1);
                    break;
                }
            }
        }
    }

    /**
     * Removes from the board all cards from a given group.
     * @param {int} groupId
     */
    function removeGroup(groupId) {
        var cards = getCardsInGroup(groupId);
        for (var i = 0; i < cards.length; i++) {
            removeCard(cards[i].id);
        }
        faAvailableGroupIds.push(groupId);
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
