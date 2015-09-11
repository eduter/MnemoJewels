mj.modules.score = (function() {

    var main;
    var States;
    var score = 0;
    var consecutiveMatches = 0;

    function setup() {
        main = mj.modules.main;
        States = mj.modules.cards.States;
        main.bind('gameStart', onGameStart);
        main.bind('match', onMatch);
        main.bind('mismatch', onMismatch);
    }

    function onGameStart() {
        score = 0;
        consecutiveMatches = 0;
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
            case States.LAPSE   : pointsEarned = 10; break;
            case States.KNOWN   : pointsEarned = 35; break;
            case States.NEW     : pointsEarned = 60; break;
            case States.LEARNING: pointsEarned = 70; break;
            default: throw "Unknown card state (" + card.state + ")";
        }
        if (card.state == States.KNOWN) {
            // depending on the relative scheduling, score varies between 15 and 55
            if (card.relativeScheduling < 0) {
                pointsEarned += Math.max(-20, 40 * card.relativeScheduling); // -0.5 -> -20
            } else {
                pointsEarned += Math.min(20, 20 * card.relativeScheduling); // 1 -> +20
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
