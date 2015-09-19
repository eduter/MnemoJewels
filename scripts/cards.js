mj.modules.cards = (function() {

    var MAX_CANDIDATES = 30;

    // Aliases
    var main, game, storage, decks, Card, TimeMeter;

    /**
     * Map of all cards from the selected deck, indexed by their IDs.
     * @type {Object.<int, Card>}
     */
    var allCards = null;

    /**
     * Index of all possible "back sides" for each "front side".
     * @type {Object.<string, Array.<string>>}
     */
    var wordMappings = null;

    /**
     * The deck currently loaded.
     * @type {Deck}
     */
    var deck = null;

    /**
     * Indexes, per card state, of cards sorted by priority.
     * @type {Object.<State, Array.<Card>>}
     */
    var indexes = {};

    /**
     * Compare functions for sorting the indexes.
     * @type {Object.<State, function>}
     */
    var cmpFuncs = {};

    /**
     * Map with all available iterators.
     * @type {Object.<string, Iterator>}
     */
    var iterators = {};

    /**
     * Number of milliseconds per unit of time.
     */
    var Time = {
        SECOND:             1000,
        MINUTE:        60 * 1000,
        HOUR:     60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000
    };

    /**
     * Defines the state of a card, regarding the player's learning progress.
     * @typedef {int} State
     */

    /**
     * Enumeration of possible card states.
     * @type {Object.<string, State>}
     */
    var States = {
        NEW:      1, // not learned yet
        LEARNING: 2, // successfully matched at least once, but never twice in a row
        KNOWN:    3, // successfully matched at least twice in a row and last time
        LAPSE:    4  // once known, but mismatched last time
    };

    /**
     * Class for iterating over all cards according to some predefined priority.
     *
     * @param {Array.<State>} priorities - defines the priority of cards according to their state
     * @constructor
     */
    function Iterator(priorities) {
        var state, card;

        this.reset = function() {
            state = 0;
            card = -1;
        };

        this.hasNext = function() {
            if (card < indexes[priorities[state]].length - 1) {
                return true;
            }
            for (var i = state + 1; i < priorities.length; i++) {
                if (indexes[priorities[i]].length > 0) {
                    return true;
                }
            }
            return false;
        };

        this.next = function () {
            var n = null;

            if (this.hasNext()) {
                do {
                    if (card < indexes[priorities[state]].length - 1) {
                        card++;
                    } else {
                        state++;
                        card = 0;
                    }
                    n = indexes[priorities[state]][card];
                } while (n == null);
            }
            return n;
        };

        this.toString = function () {
            return 'state: ' + state + ' card: ' + card + ' priorities: [' + priorities.join(', ') + ']';
        };

        this.reset();
    }

    /**
     * Initializes the module.
     */
    function setup() {
        main = mj.modules.main;
        game = mj.modules.game;
        storage = mj.modules.storage;
        decks = mj.modules.decks;
        Card = mj.classes.Card;
        TimeMeter = mj.modules.debug.TimeMeter;

        unloadDeck();

        cmpFuncs[States.NEW] = cmpId;
        cmpFuncs[States.LEARNING] = cmpRelativeScheduling;
        cmpFuncs[States.KNOWN] = cmpRelativeScheduling;
        cmpFuncs[States.LAPSE] = cmpNextRep;

        iterators = {
          learning    : new Iterator([States.LAPSE, States.NEW     , States.LEARNING, States.KNOWN]),
          reviewing   : new Iterator([States.LAPSE, States.LEARNING, States.KNOWN   , States.NEW  ]),
          alternatives: new Iterator([States.KNOWN, States.LEARNING, States.LAPSE   , States.NEW  ])
        };

        var selectedDeck = decks.getSelectedDeck();
        if (selectedDeck !== null) {
            loadCards(selectedDeck);
        }

        main.bind('deckSelected', function(eventData){loadCards(eventData.deck)});
        main.bind('match', rescheduleMatch);
        main.bind('mismatch', rescheduleMismatch);
    }

    /**
     * Loads all cards from the specified deck.
     * @param {Deck} deckToLoad
     */
    function loadCards(deckToLoad) {
        unloadDeck();
        deck = deckToLoad;
        for (var cardId = 0; cardId < deck.size; cardId++) {
            var card = storage.loadCard(deck.id, cardId);
            allCards[card.id] = card;
            indexes[card.state].push(card);
        }
        for (var s in States) {
            if (States.hasOwnProperty(s)) {
                var state = States[s];
                indexes[state].sort(cmpFuncs[state]);
            }
        }
        updateWordMappings();
    }

    /**
     * Empty all indexes, making them ready to load a new deck.
     */
    function unloadDeck() {
        deck = null;
        allCards = {};
        updateWordMappings();
        for (var s in States) {
            if (States.hasOwnProperty(s)) {
                indexes[States[s]] = [];
            }
        }
    }

    /**
     * Makes sure wordMappings is up to date with the content of allCards.
     */
    function updateWordMappings() {
        wordMappings = {};
        for (var cardId in allCards) {
            if (allCards.hasOwnProperty(cardId)) {
                var front = allCards[cardId].front;
                var back = allCards[cardId].back;
                if (front in wordMappings) {
                    if (wordMappings[front].indexOf(back) == -1) {
                        wordMappings[front].push(back);
                    }
                } else {
                    wordMappings[front] = [back];
                }
            }
        }
    }

    function toWordMap(words, frontKey, backKey) {
        var map = {};

        for (var i = 0; i < words.length; i++) {
            var front = words[i][frontKey];
            var back = words[i][backKey];
            if (map[front]) {
                if (map[front].indexOf(back) == -1) {
                    map[front].push(back);
                }
            } else {
                map[front] = [back];
            }
        }
        return map;
    }

    function inWordMap(map, front, back) {
        return (map[front] && map[front].indexOf(back) >= 0);
    }

    function diff(wordList) {
        var map = toWordMap(wordList, 0, 1);
        var add = [];
        var remove = [];

        for (var i = 0; i < wordList.length; i++) {
            if (!inWordMap(wordMappings, wordList[i][0], wordList[i][1])) {
                add.push(wordList[i]);
            }
        }

        for (var id in allCards) {
            if (allCards.hasOwnProperty(id)) {
                if (!inWordMap(map, allCards[id].front, allCards[id].back)) {
                    remove.push(id);
                }
            }
        }

        return { add: add, remove: remove };
    }

    /**
     * Checks if a card conflicts with any card from a given array of cards.
     *
     * @param {Card} card
     * @param {Array.<Card>} cards
     * @returns {boolean}
     */
    function conflicts(card, cards) {
        for (var i = 0; i < cards.length; i++) {
            if (cardsConflict(card, cards[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if two cards conflict with each other (i.e. can create ambiguity, if presented together).
     *
     * @param {Card} card1
     * @param {Card} card2
     * @returns {boolean}
     */
    function cardsConflict(card1, card2) {
        return card1.front == card2.front
            || card1.back == card2.back
            || wordMappings[card1.front].indexOf(card2.back) >= 0
            || wordMappings[card2.front].indexOf(card1.back) >= 0
    }

    /**
     * Creates a new group, containing cards chosen according to the current priorities.
     *
     * @param {int} groupSize - the number of cards the new group should have
     * @param {Array.<Card>} cardsInUse - other cards in use (to avoid conflicts)
     * @returns {Array.<Card>}
     */
    function createNewGroup(groupSize, cardsInUse) {
        console.group('createNewGroup');
        var firstCard = chooseFirst(cardsInUse);
        TimeMeter.start('CA');
        var alternatives = chooseAlternatives(groupSize, firstCard, cardsInUse);
        TimeMeter.stop('CA');
        var group = [firstCard].concat(alternatives);

        for (var i = 0; i < group.length; i++) {
            removeFromIndex(group[i]);
            console.log(group[i].toString());
        }
        console.groupEnd();
        return group;
    }

    function chooseFirst(cardsInUse) {
        var learningSetSize = indexes[States.LAPSE].length + indexes[States.LEARNING].length;
        var learningSetFullness = Math.min(1, learningSetSize / mj.settings.MAX_LEARNING);
        var probabilityReview = (1 - game.getDifficulty()) * learningSetFullness;
        var probabilityLearn = 1 - probabilityReview;
        var weights = [probabilityReview, probabilityLearn];
        var iteratorsIndex = ['reviewing', 'learning'];
        var index = mj.modules.utils.weighedRandom(weights);
        var iteratorName = iteratorsIndex[index];
        var i = iterators[iteratorName];

        console.log('learning: ' + learningSetSize + '   level: ' + game.getLevel() + '   iterator: ' + iteratorName + '   weights: ' + weights);

        i.reset();
        while (i.hasNext()) {
            var card = i.next();
            if (!card.isSuspended() && !conflicts(card, cardsInUse)) {
                return card;
            }
        }
        return null;
    }

    function chooseAlternatives(groupSize, firstCard, cardsInUse) {
        var i = iterators.alternatives;
        var otherCards = cardsInUse.concat(firstCard);
        var alternatives = [];
        var candidates = [];
        var count = 0;

        // Process all cards inside the scope and create an array of candidates sorted by distance
        i.reset();
        while (i.hasNext() && count < game.getScopeSize()) {
            var card = i.next();
            if (!card.isSuspended() && !conflicts(card, otherCards)) {
                card.distance = Math.min(levenshtein(card.front, firstCard.front), levenshtein(card.back, firstCard.front));
                var rank = Math.abs(candidates.find(card, cmpDistance));
                if (rank < MAX_CANDIDATES) {
                    while (candidates[rank] && candidates[rank].distance == card.distance) rank++;
                    candidates.splice(rank, 0, card);
                    if (candidates.length > MAX_CANDIDATES) {
                        candidates.pop().distance = undefined; // cleanup
                    }
                } else {
                    card.distance = undefined; // cleanup
                }
            }
            count++;
        }

        // cleanup
        for (var a = 0; a < candidates.length; a++) {
            candidates[a].distance = undefined;
        }

        // Choose the first non-conflicting cards
        var c = 0;
        while (alternatives.length < groupSize - 1) {
            if (!conflicts(candidates[c], alternatives)) {
                alternatives.push(candidates[c]);
            }
            c++;
        }
        return alternatives;
    }

    function cmpDistance(c1, c2) {
        return (c1.distance - c2.distance);
    }

    function addToIndex(card) {
        var index = indexes[card.state];
        var position = - index.find(card, cmpFuncs[card.state]);
        index.splice(position, 0, card);
    }

    function removeFromIndex(card) {
        var index = indexes[card.state];
        var position = index.find(card, cmpFuncs[card.state]);
        index.splice(position, 1);
    }

    function rescheduleMatch(eventData) {
        console.group('rescheduleMatch');
        var cardsInGroup = eventData.cardsInGroup;
        var groupSize = cardsInGroup.length;

        // Replace the data objects by the actual Card instances
        for (var c = 0; c < groupSize; c++) {
            cardsInGroup[c] = allCards[cardsInGroup[c].id];
        }

        for (var i = 0; i < groupSize; i++) {
            var match = (cardsInGroup[i].id == eventData.cardId);
            console.log((match ? 'v ' : '  ') + cardsInGroup[i].toString());
        }

        var card = allCards[eventData.cardId]; // TODO: fix this
        var now = Date.now();

        if (groupSize > 1) {
            var minInterval = (groupSize * 1000 / eventData.thinkingTime * Time.DAY);

            if (card.lastRep) {
                var scheduledInterval = card.nextRep - card.lastRep;
                var actualInterval = now - card.lastRep;
                var multiplier = card.easiness * (groupSize - 1) / 2;
                var nextInterval = Math.max(minInterval, multiplier * actualInterval, scheduledInterval * 1.1);
                card.setSchedule(now, Math.floor(now + nextInterval));
                // card.easiness = ? // TODO
            } else {
                card.setSchedule(now, Math.floor(now + minInterval));
            }

            if (card.state == States.NEW) {
                card.state = States.LEARNING;
            } else {
                card.state = States.KNOWN;
            }

            storage.storeCard(deck.id, card);
        }
        card.suspend(now + groupSize * 30 * Time.SECOND);
        addToIndex(card);
        console.groupEnd();
    }

    function debugReview() {
        // TODO: add back to index the cards which are on the board when game is over
        var learning = indexes[States.LAPSE].length + indexes[States.LEARNING].length;
        var i = iterators.reviewing;
        var l = 0;

        console.group('debugReview (learning = ' + learning + ')');
        i.reset();
        while (i.hasNext() && l < learning) {
            var card = i.next();
            console.log(card.toString());
            l++;
        }
        console.groupEnd();
    }

    function rescheduleMismatch(eventData) {
        console.group('rescheduleMismatch');
        var mismatchedCards = eventData.mismatchedCards;
        var cardsInGroup = eventData.cardsInGroup;

        // Replace the data objects by the actual Card instances
        for (var p = 0; p < cardsInGroup.length; p++) {
            cardsInGroup[p] = allCards[cardsInGroup[p].id];
        }

        for (var j = 0; j < cardsInGroup.length; j++) {
            var mismatch = (mismatchedCards.indexOf(cardsInGroup[j].id) > -1);
            console.log((mismatch ? 'X ' : '  ') + cardsInGroup[j].toString());
        }

        var now = Date.now();
        var nextRep = now + 2 * Time.MINUTE;
        for (var m = 0; m < mismatchedCards.length; m++) {
            var card = allCards[mismatchedCards[m]];

            card.setSchedule(now, nextRep);
            if (card.state == States.NEW || card.state == States.LEARNING) {
                card.state = States.NEW;
            } else {
                card.state = States.LAPSE;
            }
            storage.storeCard(deck.id, card);
        }
        for (var i = 0; i < cardsInGroup.length; i++) {
            cardsInGroup[i].suspend(now + 15 * Time.SECOND);
            addToIndex(cardsInGroup[i]);
        }
        console.groupEnd();
    }

    /**
     * Returns some stats about the number of cards in each state.
     * @return {Array.<{state: string, count: int}>}
     */
    function getStatesStats() {
        var stats = [];
        for (var stateName in States) {
            if (States.hasOwnProperty(stateName)) {
                var stateCode = States[stateName];
                stats.push({state: stateName, count: indexes[stateCode].length});
            }
        }
        return stats;
    }

    /**
     * Gets the number of cards currently loaded.
     * @return {int}
     */
    function getTotalCards() {
        return (deck ? deck.size : 0);
    }

    // Cannot be used for comparing non-scheduled cards
    function cmpRelativeScheduling(c1, c2) {
        return (c2.relativeScheduling - c1.relativeScheduling) || cmpId(c1, c2);
    }

    function cmpNextRep(c1, c2) {
        return (c1.nextRep - c2.nextRep) || cmpId(c1, c2);
    }

    function cmpId(c1, c2) {
        return (c1.id - c2.id);
    }

    /**
     * Performs a binary search.
     *
     * @param {*} searchElement The item to search for
     * @param {function} cmpFunc compare function
     * @return {Number} The index of the element, if found, or the complement of where it would be
     */
    Array.prototype.find = function(searchElement, cmpFunc) {
        var currentIndex, currentElement, cmpRes;
        var minIndex = 0;
        var maxIndex = this.length - 1;

        while (minIndex <= maxIndex) {
            currentIndex = (minIndex + maxIndex) / 2 | 0;
            currentElement = this[currentIndex];
            cmpRes = cmpFunc(currentElement, searchElement);
            if (cmpRes < 0) {
                minIndex = currentIndex + 1;
            } else if (cmpRes > 0) {
                maxIndex = currentIndex - 1;
            } else {
                return currentIndex;
            }
        }
        return ~maxIndex;
    };

    // http://kevin.vanzonneveld.net
    // +            original by: Carlos R. L. Rodrigues (http://www.jsfromhell.com)
    // +            bugfixed by: Onno Marsman
    // +             revised by: Andrea Giammarchi (http://webreflection.blogspot.com)
    // + reimplemented by: Brett Zamir (http://brett-zamir.me)
    // + reimplemented by: Alexander M Beedie
    // *                example 1: levenshtein('Kevin van Zonneveld', 'Kevin van Sommeveld');
    // *                returns 1: 3
    function levenshtein (s1, s2) {
        if (s1 == s2) {
            return 0;
        }
        var s1_len = s1.length;
        var s2_len = s2.length;
        if (s1_len === 0) {
            return s2_len;
        }
        if (s2_len === 0) {
            return s1_len;
        }
        var v0 = new Array(s1_len + 1);
        var v1 = new Array(s1_len + 1);
        var s1_idx, s2_idx, cost = 0;
        for (s1_idx = 0; s1_idx < s1_len + 1; s1_idx++) {
            v0[s1_idx] = s1_idx;
        }
        var char_s1 = '',
            char_s2 = '';
        for (s2_idx = 1; s2_idx <= s2_len; s2_idx++) {
            v1[0] = s2_idx;
            char_s2 = s2[s2_idx - 1];
            for (s1_idx = 0; s1_idx < s1_len; s1_idx++) {
                char_s1 = s1[s1_idx];
                cost = (char_s1 == char_s2) ? 0 : 1;
                var m_min = v0[s1_idx + 1] + 1;
                var b = v1[s1_idx] + 1;
                var c = v0[s1_idx] + cost;
                if (b < m_min) {
                    m_min = b;
                }
                if (c < m_min) {
                    m_min = c;
                }
                v1[s1_idx + 1] = m_min;
            }
            var v_tmp = v0;
            v0 = v1;
            v1 = v_tmp;
        }
        return v0[s1_len];
    }

    return {
        setup: setup,
        createNewGroup: createNewGroup,
        getStatesStats: getStatesStats,
        getTotalCards: getTotalCards,
        diff: diff,
        debugReview: debugReview,
        States: States
    };
})();
