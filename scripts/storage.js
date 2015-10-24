mj.modules.storage = (function() {

    /**
     * Prefix for all keys (to avoid collisions, in case something else in the same domain uses local storage).
     * @type {string}
     */
    var NAMESPACE = 'mj.';

    /**
     * Migration functions. The N-th element migrates the storage model from version N to version N+1.
     * @type {Array.<function>}
     */
    var migrations = [
        function(){
            var decks = load('decks') || [];
            for (var deckId in decks) {
                if (decks.hasOwnProperty(deckId)) {
                    var deck = decks[deckId];
                    if (deck.displayName == 'Swedish / English') {
                        deck.uid = 'top-sv-en';
                        deck.languageFront = 'sv';
                        deck.languageBack = 'en';
                    }
                }
            }
            store('decks', decks);
            store('topScores', load('topScores') || []);
        }
    ];

    /**
     * Initializes the module and updates the storage model.
     */
    function setup() {
        var modelVersion = load('modelVersion') || 0;
        console.log('storage model v' + modelVersion);
        while (modelVersion < migrations.length) {
            console.log('migrating to version ' + (modelVersion + 1) + '...');
            migrations[modelVersion++]();
            store('modelVersion', modelVersion);
            console.log('successfully migrated to v' + modelVersion);
        }
    }

    /**
     * Stores a value in the local storage.
     *
     * @param {string} key
     * @param {*} value
     */
    function store(key, value) {
        var serializedValue = JSON.stringify(value);
        localStorage.setItem(NAMESPACE + key, serializedValue);
    }

    /**
     * Loads a value from the local storage.
     *
     * @param {string} key
     * @return {*}
     */
    function load(key) {
        var item = localStorage.getItem(NAMESPACE + key);
        return (item === null ? null : JSON.parse(item));
    }

    /**
     * Stores a card in the local storage.
     *
     * @param {int} deckId
     * @param {Card} card
     */
    function storeCard(deckId, card) {
        store(getCardKey(deckId, card.id), card.serialize());
    }

    /**
     * Loads a card from the local storage.
     *
     * @param {int} deckId
     * @param {int} cardId
     * @return {Card|null}
     */
    function loadCard(deckId, cardId) {
        var cardData = load(getCardKey(deckId, cardId));
        return (cardData === null ? null : mj.classes.Card.unserialize(cardId, cardData));
    }

    /**
     * Calculates the key used to store a card.
     *
     * @param {int} deckId
     * @param {int} cardId
     * @return {string}
     */
    function getCardKey(deckId, cardId) {
        return 'd' + deckId + 'c' + cardId;
    }

    return {
        setup: setup,
        store: store,
        load: load,
        storeCard: storeCard,
        loadCard: loadCard
    };
})();
