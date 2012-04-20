mj.modules.cards = (function() {
    
    var Pair = null;
    
    var faPairs = [
        ['dog', 'cão'],
        ['cat', 'gato'],
        ['duck', 'pato'],
        ['duck', 'abaixar-se'],
        ['red', 'vermelho'],
        ['pump', 'bomba'],
        ['bomb', 'bomba'],
        ['white', 'branco'],
        ['blue', 'azul'],
        ['green', 'verde'],
        ['house', 'casa'],
        ['table', 'mesa'],
        ['table', 'tabela'],
        ['chicken', 'galinha'],
        ['horse', 'cavalo'],
        ['cow', 'vaca'],
        ['bed', 'cama'],
        ['bad', 'ruim, mau'],
        ['which', 'qual'],
        ['witch', 'bruxo(a)'],
        ['with', 'com'],
        ['chair', 'cadeira']
    ];
    
    function setup() {
        Pair = mj.classes.Pair;
    }
    
    function rand(piMax) {
        return (Math.floor(Math.random() * piMax));
    }
    
    function getNextGroup(piSize, paPairsInUse) {
        var maPairs = [];
        
        while (maPairs.length < piSize) {
            var miPairId = rand(faPairs.length);
            var moPair = new Pair(miPairId, faPairs[miPairId][0], faPairs[miPairId][1]);
            var mbUsable = true;
            
            for (var i in maPairs) {
                if (moPair.conflictsWith(maPairs[i])) {
                    mbUsable = false;
                    break;
                }
            }
            if (mbUsable) {
                for (var i in paPairsInUse) {
                    if (pairsConflict(moPair, paPairsInUse[i])) {
                        mbUsable = false;
                        break;
                    }
                }
                if (mbUsable) {
                    maPairs.push(moPair);
                }
            }
        }
        return maPairs;
    }
    
    function pairsConflict(poPair, poAnotherPairId) {
        var moAnotherPair = new Pair(poAnotherPairId, faPairs[poAnotherPairId][0], faPairs[poAnotherPairId][1]);
        return (poPair.conflictsWith(moAnotherPair));
    }
    
    function rescheduleMatch(piPairId, paPairsInGroup, piThinkingTime) {
        // TODO
        console.group('TODO: rescheduleMatch');
        console.dir({
            'piPairId': piPairId,
            'paPairsInGroup': paPairsInGroup,
            'piThinkingTime': piThinkingTime
        });
        console.groupEnd();
    }
    
    function rescheduleMismatch(paMismatchedPairs, paPairsInGroup, piThinkingTime) {
        // TODO
        console.group('TODO: rescheduleMismatch');
        console.dir({
            'paMismatchedPairs': paMismatchedPairs,
            'paPairsInGroup': paPairsInGroup,
            'piThinkingTime': piThinkingTime
        });
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
        getNextGroup : getNextGroup,
        rescheduleMatch : rescheduleMatch,
        rescheduleMismatch : rescheduleMismatch
    };
})();
