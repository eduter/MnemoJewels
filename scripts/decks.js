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
     * Represents a user deck, with its metadata, but not its cards.
     *
     * @typedef {{
     *   id: int, displayName: string, size: int,
     *   languageFront: [string], languageBack: [string],
     *   uid: [string], version: [int]
     * }} Deck
     *
     * {int} id - uniquely identifies the deck among all decks the user has in the storage
     * {String} displayName - how the deck is referred to in the UI
     * {int} size - how many cards the deck contains
     * {String} [languageFront] - the code of the language used in the front side of the cards
     * {String} [languageBack] - the code of the language used in the back side of the cards
     * {String} [uid] - imported decks with an uid and a version can be updated
     * {int} [version] - version number used to keep imported decks updated
     */

    /**
     * Represents all the data required to import a deck.
     *
     * @typedef {{
     *   displayName: string, cards: Array.<Array.<string>>,
     *   languageFront: [string], languageBack: [string],
     *   uid: [string], version: [int]
     * }} DeckData
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

        // sorts the list of decks available for importing
        mj.decks.sort(function(deckData1, deckData2) {
            return (deckData1.displayName < deckData2.displayName ? -1 : 1);
        });

        main.bind('initialize-storage', function(){
            decks = storage.load(StorageKeys.DECKS) || [];
            updateDecks();

            var preselectedDeck = storage.load(StorageKeys.SELECTED_DECK);
            if (preselectedDeck !== null) {
                selectDeck(preselectedDeck);
            }
        });
    }

    /**
     * Updates all imported decks to their latest version.
     */
    function updateDecks() {
        console.log('updating decks...');
        var decksByUid = {};

        mj.decks.forEach(function(deck){
            if (deck.uid) {
                decksByUid[deck.uid] = deck;
            }
        });

        decks.forEach(function(deck){
            var deckData = decksByUid[deck.uid];

            if (deckData && deckData.version > (deck.version || 0)) {
                updateDeck(deck, deckData);
            }
        });
        console.log('decks up to date');
    }

    /**
     * Changes the selected deck.
     * @param {int} deckId
     */
    function selectDeck(deckId) {
        if (deckId !== selectedDeck) {
            var deckIndex = getDeck(deckId);
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
        var deckIndex = getDeck(selectedDeck);
        return (deckIndex === null ? null : utils.copyData(decks[deckIndex]));
    }

    /**
     * Finds a deck by its ID in the list of decks.
     *
     * @param {int} deckId
     * @return {int|null} index of the deck (in "decks") or null, if not found
     */
    function getDeck(deckId) {
        for (var i = 0; i < decks.length; i++) {
            if (decks[i].id === deckId) {
                return i;
            }
        }
        return null;
    }

    /**
     * Returns a deck that satisfies the provided testing function, if there is one. Otherwise returns undefined.
     *
     * @param {function} callback - the test function to be executed on each deck
     * @return {Deck|undefined}
     */
    function findDeck(callback) {
        return decks.filter(callback)[0];
    }

    /**
     * Imports and stores a new deck.
     *
     * @param {DeckData} deckData
     * @return {Deck} - the info about the imported deck
     */
    function importDeck(deckData) {
        var deck = createDeck(generateNewId(), deckData);

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
     * Updates a deck, inserting/removing/sorting cards, but keeping the learning data.
     *
     * @param {Deck} deck - the outdated deck
     * @param {DeckData} deckData - the updated deck data
     */
    function updateDeck(deck, deckData) {
        var index = indexCardsByContent(deck);

        console.log('updating deck ' + deck.uid);

        storage.transaction(function(){
            var cardId;

            // remove all old cards
            for (cardId = 0; cardId < deck.size; cardId++) {
                storage.removeCard(deck.id, cardId);
            }

            // update deck metadata on the deck list
            decks = decks.map(function(d){
                if (d.id === deck.id) {
                    return createDeck(deck.id, deckData);
                }
                return d;
            });
            storage.store(StorageKeys.DECKS, decks);

            // add new cards with existing learning data, if any
            for (cardId = 0; cardId < deckData.cards.length; cardId++) {
                var front = deckData.cards[cardId][0];
                var back = deckData.cards[cardId][1];
                var card;

                if (front in index && back in index[front]) {
                    card = Card.unserialize(cardId, index[front][back]);
                } else {
                    card = new Card(cardId, front, back);
                }
                storage.storeCard(deck.id, card);
            }
        });
    }

    /**
     * Creates a deck, copying its metadata from a DeckData object.
     *
     * @param {int} deckId
     * @param {DeckData} deckData
     * @return {Deck}
     */
    function createDeck(deckId, deckData) {
        return {
            id: deckId,
            uid: deckData.uid,
            version: deckData.version,
            displayName: deckData.displayName,
            languageFront: deckData.languageFront,
            languageBack: deckData.languageBack,
            size: deckData.cards.length
        };
    }

    /**
     * Creates a a structure, in which all cards from a deck are indexed by their front and back sides.
     *
     * @param {Deck} deck - the deck to be indexed
     * @return {Object} a map in which index[front][back] = serializedCard
     */
    function indexCardsByContent(deck) {
        var index = {};
        for (var id = 0; id < deck.size; id++) {
            var card = storage.loadCard(deck.id, id);
            if (!(card.front in index)) {
                index[card.front] = {};
            }
            index[card.front][card.back] = card.serialize();
        }
        return index;
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
        findDeck: findDeck,
        getSelectedDeck: getSelectedDeck,
        importDeck: importDeck
    };
})();
