mj.modules.decks = (function() {

    // Aliases
    var main, storage, utils, Card;

    /**
     * Keys this module uses from the storage.
     */
    var StorageKeys = {
        SELECTED_DECK: 'selectedDeck',
        DECKS: 'decks'
    };

    /**
     * Represents a deck of cards, with a display name and the number of cards it contains.
     * @typedef {{id: int, displayName: string, size: int}} Deck
     */

    /**
     * Map of all existing decks indexed by their IDs.
     * @type {Array.<Deck>}
     */
    var decks = [];

    /**
     * ID of the selected deck, if any.
     * @type {int|null}
     */
    var selectedDeck = null;

    /**
     * Initializes the module.
     */
    function setup() {
        main = mj.modules.main;
        storage = mj.modules.storage;
        utils = mj.modules.utils;
        Card = mj.classes.Card;

        decks = storage.load(StorageKeys.DECKS) || [];

        var preselectedDeck = storage.load(StorageKeys.SELECTED_DECK);
        if (preselectedDeck !== null) {
            selectDeck(preselectedDeck);
        }
    }

    /**
     * Changes the selected deck.
     * @param {int} deckId
     */
    function selectDeck(deckId) {
        if (deckId !== selectedDeck) {
            var deckIndex = findDeck(deckId);
            if (deckIndex === null) {
                throw "Unknown deck (" + deckId + ") cannot be selected";
            } else {
                selectedDeck = deckId;
                storage.store(StorageKeys.SELECTED_DECK, deckId);
                main.trigger('deckSelected', {deck: decks[deckIndex]});
            }
        }
    }

    /**
     * Gets the info about the currently selected deck.
     * @return {Deck}
     */
    function getSelectedDeck() {
        var deckIndex = findDeck(selectedDeck);
        return (deckIndex === null ? null : decks[deckIndex]);
    }

    /**
     * Finds a deck by its ID in the list of decks.
     *
     * @param {int} deckId
     * @return {int|null} index of the deck (in "decks") or null, if not found
     */
    function findDeck(deckId) {
        for (var i = 0; i < decks.length; i++) {
            if (decks[i].id === deckId) {
                return i;
            }
        }
        return null;
    }

    /**
     * Creates and stores a new deck.
     *
     * @param {{displayName: string, cards: Array.<Array.<string>>}} deckData
     * @return {Deck} - the info about the imported deck
     */
    function importDeck(deckData) {
        var deck = {
            id: generateNewId(),
            displayName: deckData.displayName,
            size: deckData.cards.length
        };

        decks.push(deck);
        storage.store(StorageKeys.DECKS, decks);

        for (var cardId = 0; cardId < deck.size; cardId++) {
            var cardData = deckData.cards[cardId];
            var card = new Card(cardId, cardData[0], cardData[1]);
            storage.storeCard(deck.id, card);
        }
        return utils.copyData(deck);
    }

    /**
     * Updates an existing deck, adding or removing cards according to deckData.
     *
     * @param {int} deckId - deck to be updated
     * @param {{displayName: string, cards: Array.<Array.<string>>}} deckData
     * @return {Deck} - the updated info about the deck
     */
    function updateDeck(deckId, deckData) {
        // TODO
//        var oldDeckIndex = findDeck(deckId);
//        var deck = {
//            id: generateNewId(),
//            displayName: deckData.displayName,
//            size: deckData.cards.length
//        };
//
//        decks.push(deck);
//        storage.store(StorageKeys.DECKS, decks);
//
//        for (var cardId = 0; cardId < deck.size; cardId++) {
//            var cardData = deckData.cards[cardId];
//            var card = new Card(cardId, cardData[0], cardData[1]);
//            storage.storeCard(deck.id, card);
//        }
//        return utils.copyData(deck);
    }

    /**
     * Generates an ID for a new deck.
     * @return {int}
     */
    function generateNewId() {
        var maxId = -1;
        for (var i = 0; i < decks.length; i++) {
            if (decks[i].id > maxId) {
                maxId = decks[i].id;
            }
        }
        return maxId + 1;
    }

    return {
        setup: setup,
        selectDeck: selectDeck,
        getSelectedDeck: getSelectedDeck,
        importDeck: importDeck
    };
})();
