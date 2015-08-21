mj.modules.cards = (function() {

    var MAX_CANDIDATES = 30;

    var main = null;
    var game = null;
    var db = null;
    var Pair = null;
    var allCards = null;
    var wordMappings = null;
    var TimeMeter = null;
    var totalCards = null;
    var indexes = {};
    var learnIterator, reviewIterator, alternativesIterator;

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
        Pair = mj.classes.Pair;
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

        learnIterator = new Iterator([States.LAPSE, States.LEARNING, States.NEW, States.KNOWN]);
        reviewIterator = new Iterator([States.LAPSE, States.LEARNING, States.KNOWN, States.NEW]);
        alternativesIterator = new Iterator([States.KNOWN, States.LEARNING, States.LAPSE, States.NEW]);

        db.loadAllCards(function(cards){
            totalCards = cards.length;
            for (var i = 0; i < totalCards; i++) {
                var pair = new Pair(cards[i]);
                allCards[pair.fiPairId] = pair;
                indexes[pair.fiState].push(pair);
            }
            for (var s in States) {
                var state = States[s];
                indexes[state].sort(cmpFuncs[state]);
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
                if (!inWordMap(map, allCards[id].fsFront, allCards[id].fsBack)) {
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

    function conflicts(poPair, paPairsInUse) {
        for (var i = 0; i < paPairsInUse.length; i++) {
            if (cardsConflict(poPair, paPairsInUse[i])) {
                return true;
            }
        }
        return false;
    }

    function cardsConflict(card1, card2) {
        return card1.fsFront == card2.fsFront
            || card1.fsBack == card2.fsBack
            || wordMappings[card1.fsFront].indexOf(card2.fsBack) >= 0
            || wordMappings[card2.fsFront].indexOf(card1.fsBack) >= 0
    }

    function createNewGroup(groupSize, pairsInUse, callback) {
        console.group('createNewGroup');
        var firstCard = chooseFirst(pairsInUse);
        TimeMeter.start('CA');
        var alternatives = chooseAlternatives(groupSize, firstCard, pairsInUse);
        TimeMeter.stop('CA');
        var group = [firstCard].concat(alternatives);

        for (var i = 0; i < group.length; i++) {
            removeFromIndex(group[i]);
            console.log(group[i].toString());
        }
        console.groupEnd();
        callback(group);
    }

    function chooseFirst(pairsInUse) {
        var learning = indexes[States.LAPSE].length + indexes[States.LEARNING].length;
        var i = (learning < mj.settings.MAX_LEARNING ? learnIterator : reviewIterator);

        console.log('learning: ' + learning + '   using ' + (learning < mj.settings.MAX_LEARNING ? 'learnIterator' : 'reviewIterator'));

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
        var i = alternativesIterator;
        var otherPairs = pairsInUse.concat(firstCard);
        var alternatives = [];
        var candidates = [];
        var count = 0;

        // Process all cards inside the scope and create an array of candidates sorted by distance
        i.reset();
        while (i.hasNext() && count < game.getScopeSize()) {
            var pair = i.next();
            if (!pair.isSuspended() && !conflicts(pair, otherPairs)) {
                pair.distance = Math.min(levenshtein(pair.fsFront, firstCard.fsFront), levenshtein(pair.fsBack, firstCard.fsFront));
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
        return normalizeCmp(c1.distance - c2.distance);
    }

    function addToIndex(pair) {
        var index = indexes[pair.fiState];
        var position = - index.find(pair, cmpFuncs[pair.fiState]);
        index.splice(position, 0, pair);
    }

    function removeFromIndex(pair) {
        var index = indexes[pair.fiState];
        var position = index.find(pair, cmpFuncs[pair.fiState]);
        index.splice(position, 1);
    }

    function rescheduleMatch(eventData) {
        console.group('rescheduleMatch');
        var pairsInGroup = eventData.pairsInGroup;
        var groupSize = pairsInGroup.length;

        // Replace the data objects by the actual Pair instances
        for (var p = 0; p < groupSize; p++) {
            pairsInGroup[p] = allCards[pairsInGroup[p].fiPairId];
        }

        for (var i = 0; i < groupSize; i++) {
            var match = (pairsInGroup[i].fiPairId == eventData.pairId);
            console.log((match ? 'v ' : '  ') + pairsInGroup[i].toString());
        }

        var moPair = allCards[eventData.pairId]; // TODO: fix this
        var now = Date.now();

        if (groupSize > 1) {
            var minInterval = (groupSize * 1000 / eventData.thinkingTime * Time.DAY);

            if (moPair.fdLastRep) {
                var scheduledInterval = moPair.fdNextRep - moPair.fdLastRep;
                var actualInterval = now - moPair.fdLastRep;
                var multiplier = moPair.ffEasiness * (groupSize - 1) / 2;
                var nextInterval = Math.max(minInterval, multiplier * actualInterval, scheduledInterval * 1.1);
                moPair.setSchedule(now, Math.floor(now + nextInterval));
                // moPair.ffEasiness = ? // TODO
            } else {
                moPair.setSchedule(now, Math.floor(now + minInterval));
            }

            if (moPair.fiState == States.NEW) {
                moPair.fiState = States.LEARNING;
            } else {
                moPair.fiState = States.KNOWN;
            }

            db.updateCard(moPair);
        }
        moPair.suspend(now + groupSize * 30 * Time.SECOND);
        addToIndex(moPair);
        console.groupEnd();
    }

    function debugReview() {
        // TODO: add back to index the cards which are on the board when game is over
        var learning = indexes[States.LAPSE].length + indexes[States.LEARNING].length;
        var i = reviewIterator;
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
        var mismatchedPairs = eventData.mismatchedPairs;
        var pairsInGroup = eventData.pairsInGroup;

        // Replace the data objects by the actual Pair instances
        for (var p = 0; p < pairsInGroup.length; p++) {
            pairsInGroup[p] = allCards[pairsInGroup[p].fiPairId];
        }

        for (var j = 0; j < pairsInGroup.length; j++) {
            var mismatch = (mismatchedPairs.indexOf(pairsInGroup[j].fiPairId) > -1);
            console.log((mismatch ? 'X ' : '  ') + pairsInGroup[j].toString());
        }

        var now = Date.now();
        var nextRep = now + 2 * Time.MINUTE;
        for (var m = 0; m < mismatchedPairs.length; m++) {
            var moPair = allCards[mismatchedPairs[m]];

            moPair.setSchedule(now, nextRep);
            if (moPair.fiState == States.NEW || moPair.fiState == States.LEARNING) {
                moPair.fiState = States.NEW;
            } else {
                moPair.fiState = States.LAPSE;
            }
            db.updateCard(moPair);
        }
        for (var i = 0; i < pairsInGroup.length; i++) {
            pairsInGroup[i].suspend(now + 15 * Time.SECOND);
            addToIndex(pairsInGroup[i]);
        }
        console.groupEnd();
    }

    function getStatesStats(callback) {
        db.getStatesStats(function(statsByCode){
            var stats = [];
            for (var s in States) {
                stats.push({state: s, count: statsByCode[States[s]]});
            }
            callback(stats);
        });
    }

    function getTotalCards() {
        return totalCards;
    }

    // Cannot be used for comparing non-scheduled cards
    function cmpRelativeScheduling(c1, c2) {
        return normalizeCmp(c2.relativeScheduling - c1.relativeScheduling) || cmpId(c1, c2);
    }

    function cmpNextRep(c1, c2) {
        return normalizeCmp(c1.fdNextRep - c2.fdNextRep) || cmpId(c1, c2);
    }

    function cmpId(c1, c2) {
        return normalizeCmp(c1.fiPairId - c2.fiPairId);
    }

    function normalizeCmp(value) {
        if (value < 0) return -1;
        else if (value > 0) return 1;
        else return 0;
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
        removeCards: removeCards
    };
})();
