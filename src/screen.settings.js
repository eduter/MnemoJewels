import $ from 'jquery'
import decks from './decks'

var continueButton, backButton;

var $deckDropDown = $('#selected-deck');

/**
 * Initializes the Settings screen.
 */
function setup() {
    let $settings = $('#settings');
    continueButton = $settings.find('button.continue')[0];
    backButton = $settings.find('button.back')[0];

    $deckDropDown.change(function() {
        if (this.value == '') {
            continueButton.disabled = true;
        } else {
            continueButton.disabled = false;
            selectDeck(this.value);
            $deckDropDown.find('option[value=""]').each(function(){
                $(this).remove();
            });
        }
    });
}

/**
 * Updates the screen before displaying it.
 */
function update() {
    populateDeckDropDown();
    initializeButtonsState();
}

/**
 * Populates the deck drop-down with all pre-defined decks.
 */
function populateDeckDropDown() {
    var selectedDeck = decks.getSelectedDeck();

    function addDeckToDropDown(deck) {
        var option = document.createElement('option');
        option.value = deck.uid;
        option.innerHTML = deck.displayName;
        if (!!selectedDeck && deck.uid == selectedDeck.uid) {
            option.setAttribute('selected', 'selected');
        }
        $deckDropDown.append(option);
    }

    $deckDropDown.empty();
    if (selectedDeck === null) {
        addDeckToDropDown({uid: '', displayName: ''});
    }
    decks.getAvailableDecks().forEach(addDeckToDropDown);
}

/**
 * Switches the deck in use. Only works for pre-defined decks (i.e. the ones containing a UID).
 * If the selected deck is not imported yet, this will import it.
 *
 * @param {string} uid - the unique ID of the deck
 */
function selectDeck(uid) {
    var deck = decks.findDeck(deck => deck.uid === uid);

    if (deck) {
        decks.selectDeck(deck.id);
    } else {
        decks.importDeck(uid).then(d => decks.selectDeck(d.id));
    }
}

/**
 * Initializes visibility and enable state of the buttons.
 */
function initializeButtonsState() {
    if (decks.getSelectedDeck() === null) {
        // First run -> must select a deck
        continueButton.disabled = true;
        continueButton.style.display = 'inline';
        backButton.style.display = 'none';
    } else {
        continueButton.style.display = 'none';
        backButton.style.display = 'inline';
    }
}

export default {
    setup: setup,
    update: update
};
