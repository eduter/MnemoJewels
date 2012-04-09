jewel.cards = (function() {
    
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
    
    function rand(piMax) {
        return (Math.floor(Math.random() * piMax));
    }
    
    function getNextGroup(piSize, paPairsInUse) {
        var maPairs = [];
        
        while (maPairs.length < piSize) {
            var miPairId = rand(faPairs.length);
            var moPair = new jewel.Pair(miPairId, faPairs[miPairId][0], faPairs[miPairId][1]);
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
        var moAnotherPair = new jewel.Pair(poAnotherPairId, faPairs[poAnotherPairId][0], faPairs[poAnotherPairId][1]);
        return (poPair.conflictsWith(moAnotherPair));
    }
    
    function rescheduleMatch(piPairId, paPairsInGroup, piThinkingTime) {
        // TODO
    }
    
    function rescheduleMismatch(paMismatchedPairs, paPairsInGroup, piThinkingTime) {
        // TODO
    }
    
    return {
        getNextGroup : getNextGroup,
        rescheduleMatch : rescheduleMatch,
        rescheduleMismatch : rescheduleMismatch
    };
})();
