mj.screens['settings'] = (function() {
    var parser = null;
    var firstRun = true;
    var dom, $, db;

    function setup() {
        parser = mj.modules.parser;
        db = mj.modules.database;
        dom = mj.dom;
        $ = dom.$;

        dom.bind('#clear', 'click', function() {
            if (confirm('Are you REALLY sure you want to destroy the DB?')) {
                db.destroy();
                db.create();
            }
        });

        dom.bind('#showStats', 'click', function() {
            mj.modules.cards.getStatesStats(function(stats){
                var output = '';
                for (var i = 0; i < stats.length; i++) {
                    output += stats[i].state + ': ' + stats[i].count + '<br/>';
                }
                dom.$('#output')[0].innerHTML = output;
            });
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