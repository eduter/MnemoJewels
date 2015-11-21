mj.modules.storage = (function() {

    /**
     * Prefix for all keys (to avoid collisions, in case something else in the same domain uses local storage).
     * @type {string}
     */
    var NAMESPACE = 'mj.';

    /**
     * Prefix for keys of backups.
     * @type {string}
     */
    var BACKUP_PREFIX = 'bkp.';

    /**
     * Flag turned on while performing a transaction.
     * @type {boolean}
     */
    var insideTransaction = false;

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
        // before anything else, calls rollback, to recover from an eventual crash last time it ran
        rollback();

        var modelVersion = load('modelVersion') || 0;
        console.log('storage model v' + modelVersion);
        while (modelVersion < migrations.length) {
            console.log('migrating to version ' + (modelVersion + 1) + '...');
            transaction(function(){
                migrations[modelVersion]();
                modelVersion++;
                store('modelVersion', modelVersion);
            });
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
        var fullKey = NAMESPACE + key;
        var serializedValue = JSON.stringify(value);

        if (insideTransaction) {
            backupItem(fullKey);
        }
        localStorage.setItem(fullKey, serializedValue);
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
     * Removes a value from the local storage.
     *
     * @param {string} key
     */
    function remove(key) {
        var fullKey = NAMESPACE + key;

        if (insideTransaction) {
            backupItem(fullKey);
        }
        localStorage.removeItem(fullKey);
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
     * Removes a card from the local storage.
     *
     * @param {int} deckId
     * @param {int} cardId
     */
    function removeCard(deckId, cardId) {
        remove(getCardKey(deckId, cardId));
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

    /**
     * Makes a series of operations "atomic".
     * Inside a transaction, with multiple calls to store() or remove(), either all of them are executed, or none of them (case an exception is raised at any point during the execution of the callback).
     *
     * @param {function} callback
     */
    function transaction(callback) {
        insideTransaction = true;
        try {
            callback();
            commit();
        } catch(e) {
            rollback();
            throw e;
        } finally {
            insideTransaction = false;
        }
    }

    /**
     * Makes all changes made so far (during a transaction), permanent.
     */
    function commit() {
        allBackupKeys().forEach(function(backupKey) {
            localStorage.removeItem(backupKey);
        });
    }

    /**
     * Reverts all uncommitted changes.
     */
    function rollback() {
        allBackupKeys().forEach(function(backupKey) {
            restoreItem(backupKey);
        });
    }

    /**
     * Stores a backup of an item, unless it already has one.
     *
     * @param {string} fullKey - the full key of the item (including any prefixes it might have)
     */
    function backupItem(fullKey) {
        var backupKey = BACKUP_PREFIX + fullKey;

        if (localStorage.getItem(backupKey) === null) {
            var value = localStorage.getItem(fullKey);
            localStorage.setItem(backupKey, JSON.stringify(value));
        }
    }

    /**
     * Restores the old value of an item, from its backup.
     *
     * @param {string} backupKey - the key of the backup
     */
    function restoreItem(backupKey) {
        var fullKey = backupKey.substr(BACKUP_PREFIX.length);
        var rawValue = localStorage.getItem(backupKey);

        if (rawValue !== null) {
            var value = JSON.parse(rawValue);

            if (value === null) {
                localStorage.removeItem(fullKey);
            } else {
                localStorage.setItem(fullKey, value);
            }
            localStorage.removeItem(backupKey);
        }
    }

    /**
     * Returns a list with the keys of all existing backups.
     *
     * @return {Array.<string>}
     */
    function allBackupKeys() {
        return Object.keys(localStorage).filter(function(key){ return startsWith(key, BACKUP_PREFIX) });
    }

    /**
     * Determines whether a string begins with the characters of another string.
     *
     * @param {string} string - the string to be searched in
     * @param {string} prefix - the string to be searched for
     * @return {boolean}
     */
    function startsWith(string, prefix) {
        if (string.length < prefix) {
            return false;
        }
        for (var i = 0; i < prefix.length; i++) {
            if (string[i] !== prefix[i]) {
                return false;
            }
        }
        return true;
    }

    return {
        setup: setup,
        store: store,
        load: load,
        remove: remove,
        storeCard: storeCard,
        loadCard: loadCard,
        removeCard: removeCard,
        transaction: transaction
    };
})();
