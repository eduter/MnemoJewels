mj.modules.cards = (function() {

    var MAX_CANDIDATES = 30;

    var main = null;
    var game = null;
    var db = null;
    var Card = null;
    var allCards = null;
    var wordMappings = null;
    var TimeMeter = null;
    var totalCards = null;
    var indexes = {};
    var iterators = {};

    var Time = {
        SECOND:             1000,
        MINUTE:        60 * 1000,
        HOUR:     60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000
    };

    var States = {
        NEW:      1,
        LEARNING: 2,
        KNOWN:    3,
        LAPSE:    4
    };

    var cmpFuncs = {};

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

    function setup() {
        main = mj.modules.main;
        game = mj.modules.game;
        db = mj.modules.database;
        Card = mj.classes.Card;
        TimeMeter = mj.modules.debug.TimeMeter;

        allCards = {};

        for (var s in States) {
            if (States.hasOwnProperty(s)) {
                indexes[States[s]] = [];
            }
        }

        cmpFuncs[States.NEW] = cmpId;
        cmpFuncs[States.LEARNING] = cmpRelativeScheduling;
        cmpFuncs[States.KNOWN] = cmpRelativeScheduling;
        cmpFuncs[States.LAPSE] = cmpNextRep;

        iterators = {
          learning    : new Iterator([States.LAPSE, States.NEW     , States.LEARNING, States.KNOWN]),
          reviewing   : new Iterator([States.LAPSE, States.LEARNING, States.KNOWN   , States.NEW  ]),
          alternatives: new Iterator([States.KNOWN, States.LEARNING, States.LAPSE   , States.NEW  ])
        };

        db.loadAllCards(function(cards){
            totalCards = cards.length;
            for (var i = 0; i < totalCards; i++) {
                var card = Card.fromDb(cards[i]);
                allCards[card.id] = card;
                indexes[card.state].push(card);
            }
            for (var s in States) {
                if (States.hasOwnProperty(s)) {
                    var state = States[s];
                    indexes[state].sort(cmpFuncs[state]);
                }
            }
            wordMappings = toWordMap(cards, 'sFront', 'sBack');


            debugReview(); // TODO
        });

        main.bind('match', rescheduleMatch);
        main.bind('mismatch', rescheduleMismatch);
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

    function addCards(words) {
        db.insertWords(words);
    }

    function removeCards(ids) {
        db.removeCards(ids);
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

    function chooseFirst(pairsInUse) {
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
            var pair = i.next();
            if (!pair.isSuspended() && !conflicts(pair, pairsInUse)) {
                return pair;
            }
        }
        return null;
    }

    function chooseAlternatives(groupSize, firstCard, pairsInUse) {
        var i = iterators.alternatives;
        var otherPairs = pairsInUse.concat(firstCard);
        var alternatives = [];
        var candidates = [];
        var count = 0;

        // Process all cards inside the scope and create an array of candidates sorted by distance
        i.reset();
        while (i.hasNext() && count < game.getScopeSize()) {
            var pair = i.next();
            if (!pair.isSuspended() && !conflicts(pair, otherPairs)) {
                pair.distance = Math.min(levenshtein(pair.front, firstCard.front), levenshtein(pair.back, firstCard.front));
                var rank = Math.abs(candidates.find(pair, cmpDistance));
                if (rank < MAX_CANDIDATES) {
                    while (candidates[rank] && candidates[rank].distance == pair.distance) rank++;
                    candidates.splice(rank, 0, pair);
                    if (candidates.length > MAX_CANDIDATES) {
                        candidates.pop().distance = undefined; // cleanup
                    }
                } else {
                    pair.distance = undefined; // cleanup
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

    function addToIndex(pair) {
        var index = indexes[pair.state];
        var position = - index.find(pair, cmpFuncs[pair.state]);
        index.splice(position, 0, pair);
    }

    function removeFromIndex(pair) {
        var index = indexes[pair.state];
        var position = index.find(pair, cmpFuncs[pair.state]);
        index.splice(position, 1);
    }

    function rescheduleMatch(eventData) {
        console.group('rescheduleMatch');
        var cardsInGroup = eventData.cardsInGroup;
        var groupSize = cardsInGroup.length;

        // Replace the data objects by the actual Card instances
        for (var p = 0; p < groupSize; p++) {
            cardsInGroup[p] = allCards[cardsInGroup[p].id];
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

            db.updateCard(card);
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
            var pair = i.next();
            console.log(pair.toString());
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
            db.updateCard(card);
        }
        for (var i = 0; i < cardsInGroup.length; i++) {
            cardsInGroup[i].suspend(now + 15 * Time.SECOND);
            addToIndex(cardsInGroup[i]);
        }
        console.groupEnd();
    }

    function getStatesStats(callback) {
        db.getStatesStats(function(statsByCode){
            var stats = [];
            for (var s in States) {
                if (States.hasOwnProperty(s)) {
                    stats.push({state: s, count: statsByCode[States[s]]});
                }
            }
            callback(stats);
        });
    }

    function getTotalCards() {
        return totalCards;
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
        addCards: addCards,
        debugReview: debugReview,
        removeCards: removeCards,
        States: States
    };
})();
