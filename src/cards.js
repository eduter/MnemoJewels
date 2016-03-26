import constants from './constants'
import events from './events'
import storage from './storage'
import game from './game'
import decks from './decks'
import time from './time'
import utils from './utils'
import Card from './Card'
import States from './States'
import TimeMeter from './TimeMeter'

var TimeUnits = time.TimeUnits;

/**
 * Maximum number of cards to consider when choosing alternatives - for optimization purposes only, nothing to do with scope.
 * @type {int}
 */
var MAX_CANDIDATES = 30;

/**
 * Maximum "acceptable" number of cards with isMismatched equal to true (not a hard limit).
 * @type {int}
 */
var ACCEPTABLE_MISMATCHES = 30;

/**
 * List of all cards from the selected deck (their index is also their ID).
 * @type {Array.<Card>}
 */
var allCards = [];

/**
 * Index of all possible "back sides" for each "front side".
 * @type {Object.<string, Array.<string>>}
 */
var wordMappings = null;

/**
 * Maps cards' front side to a language-specific normalized version of themselves.
 * @type {Object.<string, string>}
 */
var normalizedFront = null;

/**
 * Maps cards' back side to a language-specific normalized version of themselves.
 * @type {Object.<string, string>}
 */
var normalizedBack = null;

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
 * Number of mismatched cards currently present in the indexes.
 * @type {int}
 */
var mismatchCount = 0;

/**
 * Cards currently in use by the game.
 * @type {Array.<Card>}
 */
var cardsInGame = [];

/**
 * Compare functions for sorting the indexes.
 * @type {Object.<State, function>}
 */
var cmpFuncs = {
    [States.NEW]: cmpId,
    [States.LEARNING]: cmpRelativeScheduling,
    [States.KNOWN]: cmpRelativeScheduling,
    [States.LAPSE]: cmpNextRep
};

/**
 * Map with all available iterators.
 * @type {Object.<string, Iterator>}
 */
var iterators = {
    learning    : new Iterator([States.LAPSE, States.NEW     , States.LEARNING, States.KNOWN]),
    reviewing   : new Iterator([States.LAPSE, States.LEARNING, States.KNOWN   , States.NEW  ]),
    alternatives: new Iterator([States.KNOWN, States.LEARNING, States.LAPSE   , States.NEW  ])
};

/**
 * Language-specific functions to normalize words before they are compared.
 * @type {Object.<string, function>}
 */
var normalizationFunctions = {
    no: function(word){ return word.toLowerCase().replace(/å/g, 'a').replace(/ø/g, 'o') },
    sv: function(word){ return word.toLowerCase().replace(/[äå]/g, 'a').replace(/ö/g, 'o') }
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
(function setup() {
    let selectedDeck = decks.getSelectedDeck();

    unloadDeck();
    if (selectedDeck !== null) {
        loadDeck(selectedDeck);
    }

    events.bind('deckSelected', function(eventData){loadDeck(eventData.deck)});
    events.bind('match', rescheduleMatch);
    events.bind('mismatch', rescheduleMismatch);
    events.bind('gameOver', reindexCardInGame);
    events.bind('gameOver', persistCards);
    events.bind('exitApp', persistCards);
})();

/**
 * Adds back to the index all cards which were on the board when the game ended.
 */
function reindexCardInGame() {
    while (cardsInGame.length > 0) {
        moveToIndex(cardsInGame[0]);
    }
}

/**
 * Persists the state of all cards of the selected deck.
 */
function persistCards() {
    if (deck !== null) {
        decks.storeCards(allCards);
    }
}

/**
 * Loads all cards from the specified deck.
 * @param {Deck} deckToLoad
 */
function loadDeck(deckToLoad) {
    unloadDeck();
    deck = deckToLoad;
    allCards = decks.loadCards(deckToLoad.id);
    allCards.forEach(function(card) {
        indexes[card.state].push(card);
        if (card.isMismatched) {
            mismatchCount++;
        }
    });
    sortIndexes();
    updateWordMappings();
    updateNormalizations();
}

/**
 * Empty all indexes, making them ready to load a new deck.
 */
function unloadDeck() {
    deck = null;
    allCards = [];
    mismatchCount = 0;
    updateWordMappings();
    updateNormalizations();
    clearIndexes();
}

/**
 * Empties all state indexes.
 */
function clearIndexes() {
    for (var s in States) {
        if (States.hasOwnProperty(s)) {
            indexes[States[s]] = [];
        }
    }
}

/**
 * Sorts all state indexes using their specific compare functions.
 */
function sortIndexes() {
    for (var s in States) {
        if (States.hasOwnProperty(s)) {
            var state = States[s];
            indexes[state].sort(cmpFuncs[state]);
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

/**
 * Makes sure the normalized versions of both sides of all cards currently loaded are up-to-date.
 */
function updateNormalizations() {
    normalizedFront = {};
    normalizedBack = {};

    for (var cardId in allCards) {
        if (allCards.hasOwnProperty(cardId)) {
            var front = allCards[cardId].front;
            var back = allCards[cardId].back;

            if (!(front in normalizedFront)) {
                normalizedFront[front] = normalizeWord(front, deck.languageFront);
            }
            if (!(back in normalizedBack)) {
                normalizedBack[back] = normalizeWord(back, deck.languageBack);
            }
        }
    }
}

/**
 * Applies the language-specific normalization function to a word.
 *
 * @param {string} word - the word to be normalized
 * @param {string} language - the language code (e.g. 'en', 'sv')
 * @return {string}
 */
function normalizeWord(word, language) {
    var normalizedWord = word.replace(/\s*(\([^)]*\)|\[[^\]]*\])\s*/g, ' ').trim();
    if (typeof(normalizationFunctions[language]) == 'function') {
        return normalizationFunctions[language](normalizedWord);
    }
    return normalizedWord;
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
 * @returns {Array.<Card>}
 */
function createNewGroup(groupSize) {
    console.group('createNewGroup');
    var firstCard = chooseFirstCard();
    TimeMeter.start('CA');
    var alternatives = chooseAlternatives(groupSize, firstCard);
    TimeMeter.stop('CA');
    var group = [firstCard].concat(alternatives);

    for (var i = 0; i < group.length; i++) {
        moveToGame(group[i]);
        console.log(group[i].toString());
    }
    console.groupEnd();
    return group;
}

/**
 * Chooses the first card for a new group.
 * @return {Card}
 */
function chooseFirstCard() {
    var i = chooseFirstCardIterator();
    i.reset();
    while (i.hasNext()) {
        var card = i.next();
        if (!card.isSuspended() && !conflicts(card, cardsInGame)) {
            return card;
        }
    }
    throw "Impossible to create a group - no more cards available."
}

/**
 * Given the first card of a group, choose the other cards to serve as alternatives.
 *
 * @param {int} groupSize
 * @param {Card} firstCard
 * @return {Array.<Card>} - an array with (groupSize - 1) cards
 */
function chooseAlternatives(groupSize, firstCard) {
    var candidatesPerDistance = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
    var card, distance;

    // Process all cards inside the scope and classify them by distance
    var accumulatedLength = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    var cardsToGo = game.getScopeSize();
    var otherCards = cardsInGame.concat(firstCard);
    var i = chooseAlternativesIterator();
    i.reset();
    while (i.hasNext() && cardsToGo > 0) {
        card = i.next();
        if (!card.isSuspended() && !conflicts(card, otherCards)) {
            distance = Math.min(14, Math.round(3 * cardDistance(card, firstCard)));
            if (accumulatedLength[distance] < MAX_CANDIDATES) {
                candidatesPerDistance[distance].push(card);
                for (var j = distance; j < accumulatedLength.length; j++) {
                    accumulatedLength[j]++;
                }
            }
        }
        cardsToGo--;
    }

    // Pick the best alternatives which don't conflict with each other
    var alternatives = [];
    for (distance = 0; distance < candidatesPerDistance.length && alternatives.length < groupSize - 1; distance++) {
        if (candidatesPerDistance[distance] !== undefined) {
            for (var c = 0; c < candidatesPerDistance[distance].length; c++) {
                card = candidatesPerDistance[distance][c];
                if (!conflicts(card, alternatives)) {
                    alternatives.push(card);
                    if (alternatives.length == groupSize - 1) {
                        break;
                    }
                }
            }
        }
    }
    return alternatives;
}

/**
 * Selects the iterator to be used for choosing the first card of a group.
 * @return {Iterator}
 */
function chooseFirstCardIterator() {
    var pl = probabilityLearningFirstCard();
    var probabilities = {
        'learning': pl,
        'reviewing': 1 - pl
    };
    return iterators[utils.weighedRandom(probabilities)];
}

/**
 * Selects the iterator to be used for choosing alternatives.
 * @return {Iterator}
 */
function chooseAlternativesIterator() {
    var pl = probabilityLearningAlternatives();
    var probabilities = {
        'learning': pl,
        'alternatives': 1 - pl
    };
    return iterators[utils.weighedRandom(probabilities)];
}

/**
 * Calculates the probability of selecting the 'learning' iterator for choosing the first card of a group.
 * @return {number} a value in the interval [0, 1]
 */
function probabilityLearningFirstCard() {
    var learningSetSize = indexes[States.LAPSE].length + indexes[States.LEARNING].length;
    var learningSetFullness = Math.min(learningSetSize / constants.MAX_LEARNING, 1);
    return 1 - (1 - game.getDifficulty()) * learningSetFullness;
}

/**
 * Calculates the probability of selecting the 'learning' iterator for choosing alternatives.
 * @return {number} a value in the interval [0, 1]
 */
function probabilityLearningAlternatives() {
    // How full the board and the "set of mismatched cards" are
    var b = Math.min(cardsInGame.length / 7, 1);
    var m = Math.min(mismatchCount / ACCEPTABLE_MISMATCHES, 1);

    return (1 - b) * (1 - 0.9 * m);
}

/**
 * Calculates the "distance" between a card and a candidate alternative for it (not symmetrical).
 * Distance being a measure of dissimilarity. The smaller the distance, the bigger the likelihood that the player will mistake them.
 *
 * @param {Card} candidateCard
 * @param {Card} card
 * @return {number}
 */
function cardDistance(candidateCard, card) {
    var normalizedCardFront = normalizedFront[card.front];
    var normalizedCandidateFront = normalizedFront[candidateCard.front];
    var normalizedCandidateBack = normalizedBack[candidateCard.back];
    var distanceFront = levenshtein(normalizedCandidateFront, normalizedCardFront);

    distanceFront *= 1 - 0.10 * commonPrefixLength(normalizedCandidateFront, normalizedCardFront, 5);
    distanceFront *= 1 - 0.05 * commonSuffixLength(normalizedCandidateFront, normalizedCardFront, 6);

    var distance = Math.min(
        distanceFront,
        levenshtein(normalizedCandidateBack, normalizedCardFront)
    );
    return Math.round(100 * distance) / 100;
}

/**
 * Gets the length of the longest prefix common to two words.
 *
 * @param {string} word1
 * @param {string} word2
 * @param {int} maxLength
 * @return {int}
 */
function commonPrefixLength(word1, word2, maxLength) {
    var end = Math.min(maxLength, word1.length, word2.length);
    var i = 0;
    while (i < end && word1[i] == word2[i]) i++;
    return i;
}

/**
 * Gets the length of the longest suffix common to two words.
 *
 * @param {string} word1
 * @param {string} word2
 * @param {int} maxLength
 * @return {int}
 */
function commonSuffixLength(word1, word2, maxLength) {
    var end = Math.min(maxLength, word1.length, word2.length);
    var i = 0;
    while (i < end && word1.substr(-1 - i, 1) == word2.substr(-1 - i, 1)) i++;
    return i;
}

/**
 * Moves a card from the game back to the index.
 * @param {Card} card
 */
function moveToIndex(card) {
    // add to index
    var index = indexes[card.state];
    var position = - index.binarySearch(card, cmpFuncs[card.state]);
    index.splice(position, 0, card);

    // updates mismatch counter
    if (card.isMismatched) {
        mismatchCount++;
    }

    // remove from game
    for (var i = 0; i < cardsInGame.length; i++) {
        if (cardsInGame[i].id == card.id) {
            cardsInGame.splice(i, 1);
        }
    }
}

/**
 * Moves a card from the index to the game.
 * @param {Card} card
 */
function moveToGame(card) {
    // removes from the index
    var index = indexes[card.state];
    var position = index.binarySearch(card, cmpFuncs[card.state]);
    index.splice(position, 1);

    // updates mismatch counter
    if (card.isMismatched) {
        mismatchCount--;
    }

    // adds to the game
    cardsInGame.push(card);
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
    var now = time.now();

    if (groupSize > 1) {
        var minInterval = (groupSize * 1000 / eventData.thinkingTime * TimeUnits.DAY);

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
        card.match();
    }
    card.suspend(now + groupSize * 30 * TimeUnits.SECOND);
    moveToIndex(card);
    console.groupEnd();
}

function debugReview() {
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
    var card;

    // Replace the data objects by the actual Card instances
    for (var p = 0; p < cardsInGroup.length; p++) {
        cardsInGroup[p] = allCards[cardsInGroup[p].id];
    }

    for (var j = 0; j < cardsInGroup.length; j++) {
        var mismatch = (mismatchedCards.indexOf(cardsInGroup[j].id) > -1);
        console.log((mismatch ? 'X ' : '  ') + cardsInGroup[j].toString());
    }

    var now = time.now();
    var nextRep = now + 2 * TimeUnits.MINUTE;
    for (var m = 0; m < mismatchedCards.length; m++) {
        card = allCards[mismatchedCards[m]];
        card.setSchedule(now, nextRep);
        card.mismatch();
    }
    for (var i = 0; i < cardsInGroup.length; i++) {
        card = cardsInGroup[i];
        card.suspend(now + 15 * TimeUnits.SECOND);
        moveToIndex(card);
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
Array.prototype.binarySearch = function(searchElement, cmpFunc) {
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

export default {
    createNewGroup: createNewGroup,
    getStatesStats: getStatesStats,
    getTotalCards: getTotalCards,
    diff: diff,
    debugReview: debugReview,
    probabilityLearningFirstCard: probabilityLearningFirstCard,
    probabilityLearningAlternatives: probabilityLearningAlternatives
};
