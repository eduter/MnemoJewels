mj.modules.database = (function() {
    
    var foDb = null;
    var fmTestCards = {
        'och' : 'and',
        'det' : 'it / that',
        'som' : 'that / which / who',
        'på' : 'on',
        'av' : 'of / by',
        'för' : 'for',
        'med' : 'with',
        'till' : 'to / till',
        'de' : 'they, those',
        'inte' : 'not',
        'om' : 'about / concerning',
        'men' : 'but',
        'från' : 'from',
        'så' : 'so / such',
        'kan' : 'can',
        'man' : 'one / man',
        'när' : 'when / whenever',
        'år' : 'year / years',
        'under' : 'under / during',
        'också' : 'also',
        'efter' : 'after',
        'eller' : 'or',
        'nu' : 'now',
        'vid' : 'with / at',
        'mot' : 'towards / against',
        'skulle' : 'should',
        'kommer' : 'comes',
        'vara' : 'to be',
        'alla' : 'all',
        'andra' : 'other / second',
        'mycket' : 'much',
        'än' : 'than',
        'då' : 'then',
        'sedan' : 'since',
        'över' : 'over',
        'bara' : 'just / only',
        'även' : 'also',
        'vad' : 'what',
        'få' : 'get / manage',
        'två' : '2',
        'vill' : 'will / want',
        'ha' : 'have',
        'många' : 'many',
        'hur' : 'how',
        'mer' : 'more',
        'Sverige' : 'Sweden',
        'kronor' : 'monetary unit',
        'detta' : 'this',
        'nya' : 'new',
        'procent' : 'percent'
    };
    
    function setup() {
        foDb = openDatabase('mj', '1.0', 'MnemoJewels', 2 * 1024 * 1024);
        foDb.transaction(function (tx) {
//            tx.executeSql('DROP TABLE IF EXISTS cards');
//            tx.executeSql('DROP TABLE IF EXISTS mistakes');
//            tx.executeSql('DROP TABLE IF EXISTS cards_mistakes');
            
            tx.executeSql('CREATE TABLE IF NOT EXISTS cards ('
                         +    'id INTEGER PRIMARY KEY AUTOINCREMENT,'
                         +    'sFront TEXT,'
                         +    'sBack TEXT,'
                         +    'dLastRep,'
                         +    'dNextRep,'
                         +    'fEasiness REAL'
                         +')'
            );
            tx.executeSql('CREATE TABLE IF NOT EXISTS mistakes ('
                         +    'id INTEGER PRIMARY KEY AUTOINCREMENT,'
                         +    'iRemainingReps INTEGER'
                         +')'
            );
            tx.executeSql('CREATE TABLE IF NOT EXISTS cards_mistakes ('
                         +    'idMistake INTEGER,'
                         +    'idCard INTEGER'
                         +')'
            );
        });
        
        foDb.transaction(function (tx) {
            tx.executeSql('SELECT COUNT(*) AS count FROM cards', [], function (tx, results) {
                var mbEmpty = (results.rows.item(0).count == 0);
                if (mbEmpty) {
                    for (var msFront in fmTestCards) {
                        tx.executeSql(
                            'INSERT INTO cards (sFront, sBack, fEasiness) VALUES (?, ?, 2.5)',
                            [msFront, fmTestCards[msFront]]
                        );
                    }
                }
            });
        });
    }
    
    function loadNextCards(piHowMany, pcCallback) {
        foDb.transaction(function (tx) {
            tx.executeSql(
                'SELECT * ' +
                'FROM cards ' +
                'ORDER BY dNextRep, id ' +
                'LIMIT ?',
                [piHowMany],
                function (tx, results) {
                    var maCards = [];
                    if (results.rows && results.rows.length) {
                        for (var i = 0; i < results.rows.length; i++) {
                            maCards.push(results.rows.item(i));
                        }
                    }
                    pcCallback(maCards);
                }
            );
        });
    }
    
    return {
        setup : setup,
        loadNextCards : loadNextCards
    };
})();
