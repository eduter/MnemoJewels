mj.modules.score = (function() {

    var POINTS_PER_LEVEL = 2000;

    var main;
    var States;
    var level = 1;
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
        level = 1;
        score = 0;
        consecutiveMatches = 0;
    }

    function onMatch(eventData) {
        var cardId = eventData.pairId;
        var cards = eventData.pairsInGroup;
        var card;

        for (var i = 0; i < cards.length; i++) {
            if (cards[i].fiPairId == cardId) {
                card = cards[i];
                break;
            }
        }

        // points for the match itself
        switch (card.fiState) {
            case States.LAPSE   : score += 10; break;
            case States.KNOWN   : score += 35; break;
            case States.NEW     : score += 60; break;
            case States.LEARNING: score += 70; break;
        }
        if (card.fiState == States.KNOWN) {
            // depending on the relative scheduling, score varies between 15 and 55
            var schedulingScore;
            if (card.relativeScheduling < 0) {
                schedulingScore = Math.max(-20, 40 * card.relativeScheduling); // -0.5 -> -20
            } else {
                schedulingScore = Math.min(20, 20 * card.relativeScheduling); // 1 -> +20
            }
            score += Math.round(schedulingScore);
        }

        // TODO: implement bonus for speed

        // streak bonus
        consecutiveMatches++;
        if (consecutiveMatches % 100 == 0) {
            var bonusFactor = consecutiveMatches / 1000;
            var bonusPoints = Math.round(bonusFactor * score);
            score += bonusPoints;
            main.trigger('scoreBonus', {
                name: consecutiveMatches + ' streak',
                bonus: '+' + (bonusFactor * 100) + '%',
                points: bonusPoints
            });
        }

        // updates level
        var updatedLevel = Math.min(10, Math.floor(score / POINTS_PER_LEVEL) + 1);
        if (updatedLevel > level) {
            level = updatedLevel;
            main.trigger('levelUp', {level: level});
        }
    }

    function onMismatch() {
        consecutiveMatches = 0;
    }

    return {
        setup: setup,
        getScore: function(){ return score },
        getLevel: function(){ return level }
    };
})();
