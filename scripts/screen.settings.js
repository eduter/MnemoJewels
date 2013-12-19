mj.screens['settings'] = (function() {
    var parser = null;
    var firstRun = true;
    var dom, $, db;

    function setup() {
        parser = mj.modules.parser;
        db = mj.modules.database;
        dom = mj.dom;
        $ = dom.$;

        // handle navigation button clicks
        dom.bind('#clear', 'click', function() {
            db.destroy();
            db.create();
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