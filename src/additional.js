require('../stylesheet/additional.scss');
import main from './main';
import navigation from './navigation';
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
            navigation.navigateTo('settings');
        } else {
            navigation.navigateTo('main-menu');
        }
    });
    $screen.find('.continue').removeClass('hidden');
    spinner.stop();
};
img.src = 'images/jewel.svg';
