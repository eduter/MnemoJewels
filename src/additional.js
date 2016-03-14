require('../stylesheet/additional.scss');
import main from './main';
import decks from './decks';
import spinner from './spinner';
var $ = require('jquery');


var img = new Image();
img.onload = function () {
    main.setup();
    var $screen = $('#splash-screen');
    $screen.click(function () {
        $screen.hide();
        if (decks.getSelectedDeck() == null) {
            main.navigateTo('settings');
        } else {
            main.navigateTo('main-menu');
        }
    });
    $screen.find('.continue').removeClass('hidden');
    spinner.stop();
};
img.src = 'images/jewel.svg';
