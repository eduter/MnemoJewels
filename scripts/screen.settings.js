mj.screens['settings'] = (function() {
    var dom = mj.dom;
    var parser = null;
    var firstRun = true;
    
    function setup() {
        parser = mj.modules.parser;
    }
    
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
            parser.parseXML();
        } 
    }
    
    return {
        run : run
    };
})();