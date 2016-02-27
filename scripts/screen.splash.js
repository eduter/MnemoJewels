mj.screens['splash-screen'] = (function() {
    var dom = mj.dom;
    var main = mj.modules.main;
    var firstRun = true;

    var spinner = null;
    
    function setup() {
        startSpinner();
        main.waitFor(['load-images', 'load-scripts'], function(){
            stopSpinner();
            var $screen = $('#splash-screen');
            $screen.click(function() {
                if (mj.modules.decks.getSelectedDeck() == null) {
                    main.navigateTo('settings');
                } else {
                    main.navigateTo('main-menu');
                }
            });
            $screen.find('.continue').removeClass('hidden');
        });
    }

    function startSpinner() {
        var opts = {
            lines: 11 // The number of lines to draw
            , length: 0 // The length of each line
            , width: 30 // The line thickness
            , radius: 42 // The radius of the inner circle
            , scale: 0.75 * dom.getScale() // Scales overall size of the spinner
            , corners: 1 // Corner roundness (0..1)
            , color: '#C8C864' // #rgb or #rrggbb or array of colors
            , opacity: 0.05 // Opacity of the lines
            , rotate: 0 // The rotation offset
            , direction: 1 // 1: clockwise, -1: counterclockwise
            , speed: 0.8 // Rounds per second
            , trail: 69 // Afterglow percentage
            , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
            , zIndex: 2e9 // The z-index (defaults to 2000000000)
            , className: 'spinner' // The CSS class to assign to the spinner
            , top: '50%' // Top position relative to parent
            , left: '50%' // Left position relative to parent
            , shadow: true // Whether to render a shadow
            , hwaccel: false // Whether to use hardware acceleration
            , position: 'absolute' // Element positioning
        };
        var target = $('#splash-screen').find('.spinner');
        spinner = new Spinner(opts).spin(target[0]);
    }

    function stopSpinner() {
        spinner.stop();
    }

    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
        }
    }
    
    return {
        run : run
    };
})();
