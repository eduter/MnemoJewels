import decks from './decks';

let continueButton: HTMLButtonElement;
let backButton: HTMLButtonElement;
const deckDropDown = document.getElementById('selected-deck') as HTMLSelectElement;

function setup(): void {
  const settings = document.getElementById('settings')!;
  continueButton = settings.querySelector('button.continue')!;
  backButton = settings.querySelector('button.back')!;

  deckDropDown.addEventListener('change', function () {
    if (this.value === '') {
      continueButton.disabled = true;
    } else {
      continueButton.disabled = false;
      selectDeck(this.value);
      deckDropDown.querySelectorAll('option[value=""]').forEach(function (option) {
        option.remove();
      });
    }
  });
}

function update(): void {
  populateDeckDropDown();
  initializeButtonsState();
}

function populateDeckDropDown(): void {
  const selectedDeck = decks.getSelectedDeck();

  function addDeckToDropDown(deck: { uid: string; displayName: string }): void {
    const option = document.createElement('option');
    option.value = deck.uid;
    option.innerHTML = deck.displayName;
    if (selectedDeck && deck.uid === selectedDeck.uid) {
      option.setAttribute('selected', 'selected');
    }
    deckDropDown.append(option);
  }

  deckDropDown.replaceChildren();
  if (selectedDeck === null) {
    addDeckToDropDown({ uid: '', displayName: '' });
  }
  decks.getAvailableDecks().forEach(addDeckToDropDown);
}

function selectDeck(uid: string): void {
  const deck = decks.findDeck(deck => deck.uid === uid);

  if (deck) {
    decks.selectDeck(deck.id);
  } else {
    decks.importDeck(uid).then(d => {
      if (d) {
        decks.selectDeck(d.id);
      }
    });
  }
}

function initializeButtonsState(): void {
  if (decks.getSelectedDeck() === null) {
    continueButton.disabled = true;
    continueButton.style.display = 'inline';
    backButton.style.display = 'none';
  } else {
    continueButton.style.display = 'none';
    backButton.style.display = 'inline';
  }
}

export default {
  setup,
  update,
};
