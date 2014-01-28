mj.modules.database = (function() {
    
    var foDb = null;
    var faTestCards = null;
    
    function setup() {
        faTestCards = mj.modules.testWords;
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

    function dateToStr(date) {
        if (date) {
            return new Date(date).toISOString();
        } else if (date === null) {
            return 'null';
        } else {
            return typeof date;
        }
    }

    function loadNextCards(piHowMany, pcCallback) {
        foDb.transaction(function (tx) {
            var now = Date.now();
            var parameters = [now, now];
            var query = 'SELECT c.*, 1 as ord FROM cards c WHERE dNextRep <= ? ' +
                'UNION ' +
                'SELECT c.*, 2 as ord FROM cards c WHERE dNextRep IS NULL ' +
                'UNION ' +
                'SELECT c.*, 3 as ord FROM cards c WHERE dNextRep > ? ' +
                'ORDER BY ord, dNextRep, id';
            if (piHowMany > 0) {
                parameters.push(piHowMany);
                query += ' LIMIT ?';
            }
            tx.executeSql(
                query,
                parameters,
                function (tx, results) {
                    var maCards = [];
                    if (results.rows && results.rows.length) {
                        console.group("loadNextCards(" + piHowMany + ")");
                        for (var i = 0; i < results.rows.length; i++) {
                            var r = results.rows.item(i);
                            console.log(r.id + '\t' + dateToStr(r.dLastRep) + '\t' + dateToStr(r.dNextRep) + '\t' + r.iState + '\t' + r.sFront + '\t' + r.sBack);
                            maCards.push(results.rows.item(i));
                        }
                        console.groupEnd();
                    }
                    pcCallback(maCards);
                }
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
            console.log("updateCard: " + poPair.fiPairId + '\t' + dateToStr(poPair.fdLastRep) + '\t' + dateToStr(poPair.fdNextRep) + '\t' + poPair.fiState + '\t' + poPair.fsFront + '\t' + poPair.fsBack);
        });
    }

    return {
        setup : setup,
        create: create,
        destroy: destroy,
        loadNextCards : loadNextCards,
        updateCard: updateCard
    };
})();
