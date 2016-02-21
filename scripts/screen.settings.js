mj.screens['settings'] = (function() {
    var firstRun = true;
    var dom, $, decks;
    var continueButton, backButton;

    /**
     * Initializes the Settings screen.
     */
    function setup() {
        dom = mj.dom;
        $ = dom.$;
        decks = mj.modules.decks;

        continueButton = $('#settings button.continue')[0];
        backButton = $('#settings button.back')[0];

        populateDeckDropDown();

        dom.bind('#selected-deck', 'change', function() {
            if (this.value == '') {
                continueButton.disabled = true;
            } else {
                continueButton.disabled = false;
                selectDeck(this.value);
                $('#selected-deck option[value=""]').forEach(function(option){
                    option.parentNode.removeChild(option);
                });
            }
        });
    }

    /**
     * Populates the deck drop-down with all pre-defined decks.
     */
    function populateDeckDropDown() {
        var selectedDeck = decks.getSelectedDeck();
        var deckDropDown = $('#selected-deck')[0];

        function addDeckToDropDown(deck) {
            var option = document.createElement('option');
            option.value = deck.uid;
            option.innerHTML = deck.displayName;
            if (!!selectedDeck && deck.uid == selectedDeck.uid) {
                option.setAttribute('selected', 'selected');
            }
            deckDropDown.appendChild(option);
        }

        if (selectedDeck === null) {
            addDeckToDropDown({uid: '', displayName: ''});
        }
        mj.decks.forEach(addDeckToDropDown);
    }

    /**
     * Switches the deck in use. Only works for pre-defined decks (i.e. the ones containing a UID).
     * If the selected deck is not imported yet, this will import it.
     *
     * @param {string} uid - the unique ID of the deck
     */
    function selectDeck(uid) {
        var matchesUid = function(deck){ return deck.uid === uid };
        var deck = decks.findDeck(matchesUid);

        if (deck === undefined) {
            var deckToImport = mj.decks.filter(matchesUid)[0];
            deck = decks.importDeck(deckToImport);
        }
        decks.selectDeck(deck.id);
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

    return {
        run: function() {
            if (firstRun) {
                setup();
                firstRun = false;
            }
            initializeButtonsState();
        }
    };
})();
