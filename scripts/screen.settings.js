mj.screens['settings'] = (function() {
    var parser = null;
    var firstRun = true;
    var dom, $, db, cards;

    function setup() {
        parser = mj.modules.parser;
        db = mj.modules.database;
        cards = mj.modules.cards;
        dom = mj.dom;
        $ = dom.$;

        dom.bind('#clear', 'click', function() {
            if (confirm('Are you REALLY sure you want to destroy the DB?')) {
                db.destroy();
                db.create();
            }
        });

        dom.bind('#synch', 'click', function() {
            // TODO
            alert('TODO');
//            var diff = cards.diff(mj.testWords);
//
//            if (diff.add.length || diff.remove.length) {
//                var msg = 'Are you sure you want to';
//
//                if (diff.add.length) {
//                    msg += ' add ' + diff.add.length + ' new card(s)';
//                }
//                if (diff.remove.length) {
//                    if (diff.add.length) {
//                        msg += ' and remove ' + diff.remove.length;
//                    } else {
//                        msg += ' remove ' + diff.remove.length + ' card(s)';
//                    }
//                }
//                msg += '?';
//
//                if (confirm(msg)) {
//                    cards.addCards(diff.add);
//                    cards.removeCards(diff.remove);
//                    setTimeout(function () {
//                        alert("Restart required...");
//                        location.reload();
//                    }, 1000);
//                }
//            } else {
//                alert('Already up to date');
//            }
        });

        dom.bind('#showStats', 'click', function() {
            var stats = mj.modules.cards.getStatesStats();
            var output = '';
            for (var i = 0; i < stats.length; i++) {
                output += stats[i].state + ': ' + stats[i].count + '<br/>';
            }
            dom.$('#output')[0].innerHTML = output;
        });
    }
    
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
            //parser.parse();
        } 
    }
    
    return {
        run : run
    };
})();