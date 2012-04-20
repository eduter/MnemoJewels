mj.screens['settings'] = (function() {
    var parser = null;
    var firstRun = true;
    
    function setup() {
        parser = mj.modules.parser;
    }
    
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
            parser.parse();
        } 
    }
    
    return {
        run : run
    };
})();