mj.modules.translate = (function() {

    /**
     * Process the output from batchTranslate and generate cards for a deck.
     *
     * @param {GoogleTranslations} googleTranslations
     */
    function translationsToCards(googleTranslations) {
        var cards = [];
        Object.keys(googleTranslations).forEach(function(key){
            var added = {};
            for (var i = 0; i < googleTranslations[key].length; i++) {
                var t = googleTranslations[key][i];
                var s = JSON.stringify([key, t.value]);
                if (t.frequency != 'rare' && !added[s.toLowerCase()]) {
                    cards.push(s);
                    added[s.toLowerCase()] = true;
                }
            }
        });
        console.log(cards.join(',\n'));
    }

    return {
        translationsToCards: translationsToCards
    };
})();
