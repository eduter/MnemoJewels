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
                var isDbEmpty = (results.rows.item(0).count == 0);
                if (isDbEmpty) {
                    _insertWords(tx, faTestCards);
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

    function insertWords(words) {
        foDb.transaction(function(tx){ _insertWords(tx, words) });
    }

    function _insertWords(tx, words) {
        for (var i = 0; i < words.length; i++) {
            insertWord(tx, words[i][0], words[i][1]);
        }
    }

    function insertWord(tx, front, back) {
        tx.executeSql(
            'INSERT INTO cards (sFront, sBack, fEasiness, iState) VALUES (?, ?, 2.5, 1)',
            [front, back]
        );
    }

    function removeCards(ids) {
        foDb.transaction(function (tx) {
            tx.executeSql('DELETE FROM cards WHERE id IN (' + ids.join(', ') + ')');
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

    function updateCard(poPair) {
        console.log("U " + poPair.toString());
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
        getStatesStats: getStatesStats,
        updateCard: updateCard,
        insertWords: insertWords,
        removeCards: removeCards
    };
})();
