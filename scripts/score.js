mj.modules.score = (function() {

    // Aliases
    var main, storage, States;

    /**
     * Number of top scores to keep.
     * @type {int}
     */
    var MAX_TOP_SCORES = 10;

    /**
     * Current score.
     * @type {int}
     */
    var score = 0;

    /**
     * Counter of consecutive matches in the current streak.
     * @type {number}
     */
    var consecutiveMatches = 0;

    /**
     * List of all time top scores.
     * @type {Array.<{points: int, deckId: int, start: timestamp, end: timestamp}>}
     */
    var topScores;

    function setup() {
        main = mj.modules.main;
        storage = mj.modules.storage;
        States = mj.modules.cards.States;

        topScores = mj.modules.storage.load('topScores') || [];

        main.bind('gameStart', onGameStart);
        main.bind('gameOver', updateTopScores);
        main.bind('match', onMatch);
        main.bind('mismatch', onMismatch);
    }

    function onGameStart() {
        score = 0;
        consecutiveMatches = 0;
    }

    function updateTopScores(eventData) {
        var rank = topScores.length;
        while (rank > 0 && score > topScores[rank - 1].points) {
            rank--;
        }
        if (rank < MAX_TOP_SCORES) {
            topScores.splice(rank, 0, {
                points: score,
                deckId: mj.modules.decks.getSelectedDeck().id,
                start: eventData.gameStart,
                end: eventData.gameEnd
            });
            if (topScores.length > MAX_TOP_SCORES) {
                topScores.pop();
            }
            storage.store('topScores', topScores);
        }
        console.dir({topScores: topScores});
    }

    function onMatch(eventData) {
        var cardId = eventData.cardId;
        var cards = eventData.cardsInGroup;
        var card;

        for (var i = 0; i < cards.length; i++) {
            if (cards[i].id == cardId) {
                card = cards[i];
                break;
            }
        }

        // points for the match itself
        var pointsEarned = 0;
        switch (card.state) {
            case States.LAPSE   : pointsEarned =  5; break;
            case States.KNOWN   : pointsEarned = 17; break;
            case States.NEW     : pointsEarned = 30; break;
            case States.LEARNING: pointsEarned = 35; break;
            default: throw "Unknown card state (" + card.state + ")";
        }
        if (card.state == States.KNOWN) {
            // depending on the relative scheduling, score varies between 7 and 27
            if (card.relativeScheduling < 0) {
                pointsEarned += Math.max(-10, 20 * card.relativeScheduling); // -0.5 -> -10
            } else {
                pointsEarned += Math.min(10, 10 * card.relativeScheduling); // 1 -> +10
            }
            pointsEarned = Math.round(pointsEarned);
        }
        score += pointsEarned;
        main.trigger('scoreUp', {
            points: pointsEarned,
            reason: 'match'
        });

        // TODO: implement bonus for speed

        // streak bonus
        consecutiveMatches++;
        if (consecutiveMatches % 100 == 0) {
            var bonusFactor = consecutiveMatches / 1000;
            var bonusPoints = Math.round(bonusFactor * score);
            score += bonusPoints;
            main.trigger('scoreUp', {
                points: bonusPoints,
                reason: 'streakBonus',
                streakLength: consecutiveMatches,
                bonus: '+' + (bonusFactor * 100) + '%'
            });
        }
    }

    function onMismatch() {
        consecutiveMatches = 0;
    }

    return {
        setup: setup,
        getScore: function(){ return score }
    };
})();
