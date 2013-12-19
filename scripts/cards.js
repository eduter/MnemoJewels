mj.modules.cards = (function() {

    var game = null;
    var db = null;
    var Pair = null;

    var Time = {
        SECOND:             1000,
        MINUTE:        60 * 1000,
        HOUR:     60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000
    };
    
    function setup() {
        game = mj.modules.game;
        db = mj.modules.database;
        Pair = mj.classes.Pair;
    }
    
    function rand(piMax) {
        return (Math.floor(Math.random() * piMax));
    }
    
    function createNewGroup(piSize, paPairsInUse, pcCallback) {
        db.loadNextCards(piSize * game.getScopeSize(), function(paNextCards) {
            var maPairs = [];
            
            while (maPairs.length < piSize) {
                var mmCard = paNextCards.shift();
                var moPair = new Pair(mmCard['id'], mmCard['sFront'], mmCard['sBack'], mmCard['dLastRep'], mmCard['dNextRep'], mmCard['fEasiness']);
                var mbUsable = true;
                
                for (var i in maPairs) {
                    if (moPair.conflictsWith(maPairs[i])) {
                        mbUsable = false;
                        break;
                    }
                }
                if (mbUsable) {
                    for (var i in paPairsInUse) {
                        if (moPair.conflictsWith(paPairsInUse[i])) {
                            mbUsable = false;
                            break;
                        }
                    }
                    if (mbUsable) {
                        maPairs.push(moPair);
                    }
                }
            }
            pcCallback(maPairs);
        });
    }
    
    function rescheduleMatch(piPairId, paPairsInGroup, piThinkingTime) {
        console.group('rescheduleMatch');
        console.dir({
            'piPairId': piPairId,
            'paPairsInGroup': paPairsInGroup,
            'piThinkingTime': piThinkingTime
        });
        if (paPairsInGroup.length > 1) {
            var moPair;
            var now = Date.now();

            for (var i = 0; i < paPairsInGroup.length; i++) {
                if (paPairsInGroup[i].fiPairId == piPairId) {
                    moPair = paPairsInGroup[i];
                    break;
                }
            }
            if (moPair.fdLastRep) {
                var scheduledInterval = moPair.fdNextRep - moPair.fdLastRep;
                var actualInterval = now - moPair.fdLastRep;
                var multiplier = moPair.ffEasiness * (paPairsInGroup.length - 1) / 2;
                moPair.fdNextRep = Math.floor(moPair.fdLastRep + Math.max(multiplier * actualInterval, scheduledInterval));
                console.dir({
                    scheduledInterval: scheduledInterval,
                    actualInterval: actualInterval,
                    multiplier: multiplier,
                    fdLastRep: new Date(moPair.fdLastRep),
                    fdNextRep: new Date(moPair.fdNextRep)
                });
                // moPair.ffEasiness = ? // TODO
            } else {
                moPair.fdNextRep = now + (paPairsInGroup.length * 1000 / piThinkingTime * Time.DAY);
            }
            console.log('fdNextRep: ' + new Date(moPair.fdNextRep));
            moPair.fdLastRep = now;
            db.updateCard(moPair);
        }
        console.groupEnd();
    }
    
    function rescheduleMismatch(paMismatchedPairs, paPairsInGroup, piThinkingTime) {
        console.group('rescheduleMismatch');
        console.dir({
            'paMismatchedPairs': paMismatchedPairs,
            'paPairsInGroup': paPairsInGroup,
            'piThinkingTime': piThinkingTime
        });
        var now = Date.now();
        var nextRep = now + 2 * Time.MINUTE;
        for (var m = 0; m < paMismatchedPairs.length - 1; m++) {
            for (var g = 0; g < paPairsInGroup.length - 1; g++) {
                if (paPairsInGroup[g].fiPairId == paMismatchedPairs[m]) {
                    var moPair = paPairsInGroup[g];
                    moPair.fdNextRep = nextRep;
                    moPair.fdLastRep = now;
                    db.updateCard(moPair);
                    break;
                }
            }
        }
        console.groupEnd();
    }
    
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
        var s1_idx = 0,
            s2_idx = 0,
            cost = 0;
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
        setup : setup,
        createNewGroup : createNewGroup,
        rescheduleMatch : rescheduleMatch,
        rescheduleMismatch : rescheduleMismatch
    };
})();
