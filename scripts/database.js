mj.modules.database = (function() {
    
    var foDb = null;
    var faTestCards = null;
    var TimeMeter = null;
    
    function setup() {
        faTestCards = mj.modules.testWords;
        TimeMeter = mj.modules.debug.TimeMeter;
        foDb = openDatabase('mj', '1.0', 'MnemoJewels', 2 * 1024 * 1024);
        create();
    }

    function create() {
        foDb.transaction(function (tx) {
            tx.executeSql('CREATE TABLE IF NOT EXISTS cards ('
                         +    'id INTEGER PRIMARY KEY AUTOINCREMENT,'
                         +    'sFront TEXT,'
                         +    'sBack TEXT,'
                         +    'dLastRep,'
                         +    'dNextRep,'
                         +    'iState,'
                         +    'fEasiness REAL'
                         +')'
            );
            tx.executeSql('SELECT COUNT(*) AS count FROM cards', [], function (tx, results) {
                var mbEmpty = (results.rows.item(0).count == 0);
                if (mbEmpty) {
                    for (var i = 0; i < faTestCards.length; i++) {
                        var card = faTestCards[i];
                        tx.executeSql(
                            'INSERT INTO cards (sFront, sBack, fEasiness, iState) VALUES (?, ?, 2.5, 1)',
                            [card[0], card[1]]
                        );
                    }
                }
            });
        });
        foDb.transaction(function (tx) {
            tx.executeSql('ALTER TABLE cards ADD COLUMN iState');
            tx.executeSql('UPDATE cards SET iState = 1 WHERE dLastRep IS NULL');
            tx.executeSql('UPDATE cards SET iState = 2 WHERE dNextRep - dLastRep = 120000');
            tx.executeSql('UPDATE cards SET iState = 3 WHERE iState IS NULL');
        });
    }

    function destroy() {
        foDb.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS cards');
        });
    }

    function loadAllCards(pcCallback) {
        foDb.transaction(function (tx) {
            tx.executeSql('SELECT * FROM cards', [], function (tx, results) {
                var maCards = [];
                if (results.rows && results.rows.length) {
                    for (var i = 0; i < results.rows.length; i++) {
                        maCards.push(results.rows.item(i));
                    }
                }
                pcCallback(maCards);
            });
        });
    }

    function loadNextCards(piHowMany, pcCallback) {
        foDb.transaction(function (tx) {
            var now = Date.now();
            var parameters = [now, now, piHowMany];
            var query = 'SELECT id, dNextRep, 1 as ord FROM cards c WHERE dNextRep <= ? ' +
                'UNION ' +
                'SELECT id, dNextRep, 2 as ord FROM cards c WHERE dNextRep IS NULL ' +
                'UNION ' +
                'SELECT id, dNextRep, 3 as ord FROM cards c WHERE dNextRep > ? ' +
                'ORDER BY ord, dNextRep, id ' +
                'LIMIT ?';
            TimeMeter.start('DB'); // started DB part
            tx.executeSql(
                query,
                parameters,
                function (tx, results) {
                    TimeMeter.stop('DB'); // finished DB part
                    TimeMeter.start('FE'); // started fetching part
                    var maCards = [];
                    if (results.rows && results.rows.length) {
                        for (var i = 0; i < results.rows.length; i++) {
                            maCards.push(results.rows.item(i)['id']);
                        }
                    }
                    TimeMeter.stop('FE'); // finished fetching part
                    pcCallback(maCards);
                },
                console.error
            );
        });
    }

    function updateCard(poPair) {
        foDb.transaction(function (tx) {
            tx.executeSql('\
                UPDATE cards SET \
                    dLastRep = ?, \
                    dNextRep = ?, \
                    iState = ?, \
                    fEasiness = ? \
                WHERE id = ?',
                [poPair.fdLastRep, poPair.fdNextRep, poPair.fiState, poPair.ffEasiness, poPair.fiPairId]
            );
            console.log("updateCard: " + poPair.toString());
        });
    }

    function getStatesStats(callback) {
        foDb.transaction(function (tx) {
            tx.executeSql('SELECT iState, count(*) AS count FROM cards GROUP BY iState', [], function (tx, results) {
                var stats = {};
                if (results.rows && results.rows.length) {
                    for (var i = 0; i < results.rows.length; i++) {
                        stats[results.rows.item(i)['iState']] = results.rows.item(i)['count'];
                    }
                }
                callback(stats);
            }, console.error);
        });
    }

    return {
        setup : setup,
        create: create,
        destroy: destroy,
        loadAllCards : loadAllCards,
        loadNextCards : loadNextCards,
        getStatesStats: getStatesStats,
        updateCard: updateCard
    };
})();
