import events from './events';
import storage from './storage';
import utils from './utils';
import Card from './Card';
import availableDecksMeta from './available-decks.json';
import type { AvailableDeckMeta, CardDto, Deck, DeckData } from './types';

const StorageKeys = {
  DECK_PREFIX: 'deck.',
  SELECTED_DECK: 'selectedDeck',
  DECKS: 'decks',
} as const;

let decks: Deck[] = [];
const availableDecks: AvailableDeckMeta[] = availableDecksMeta.slice();
let selectedDeck: number | null = null;
let upToDate = false;

(function setup() {
  availableDecks.sort(function (deckData1, deckData2) {
    return (deckData1.displayName < deckData2.displayName ? -1 : 1);
  });

  events.bind('storageReady', function () {
    decks = storage.load<Deck[]>(StorageKeys.DECKS) || [];
    return updateDecks().then(function () {
      upToDate = true;
      const preselectedDeck = storage.load<number>(StorageKeys.SELECTED_DECK);
      if (preselectedDeck !== null) {
        selectDeck(preselectedDeck);
      }
    }).catch(e => console.error(e));
  });
})();

function updateDecks(): Promise<void> {
  const outdated = decks.filter(function (deck) {
    const deckData = availableDecks.find(d => d.uid === deck.uid);
    return deckData && deckData.version > (deck.version || 0);
  });

  if (decks.length === 0) {
    console.log('No decks stored locally');
  } else if (outdated.length === 0) {
    console.log(`All ${decks.length} decks are up-to-date.`);
  } else {
    console.log('Updating decks...');
    return Promise.all(outdated.map(function (deck) {
      return downloadDeck(deck.uid!).then(function (deckData) {
        updateDeck(deck, deckData);
        console.log(`Deck "${deck.displayName}" up-to-date`);
      }).catch(() => console.error(`Failed to update deck "${deck.displayName}"`));
    })).then(function () {
      console.log('Finished updating decks');
    });
  }
  return Promise.resolve();
}

function selectDeck(deckId: number): void {
  console.log(`selectDeck(${deckId})`);
  if (!upToDate) {
    throw Error('A deck cannot be selected before all decks are up-to-date.');
  }
  if (deckId !== selectedDeck) {
    const deckIndex = getDeck(deckId);
    if (deckIndex === null) {
      throw new Error(`Unknown deck (${deckId}) cannot be selected`);
    } else {
      selectedDeck = deckId;
      storage.store(StorageKeys.SELECTED_DECK, deckId);
      events.trigger('deckSelected', { deck: decks[deckIndex] });
    }
  }
}

function getSelectedDeck(): Deck | null {
  const deckIndex = getDeck(selectedDeck);
  return deckIndex === null ? null : utils.copyData(decks[deckIndex]);
}

function getDeck(deckId: number | null): number | null {
  if (deckId === null) {
    return null;
  }
  for (let i = 0; i < decks.length; i++) {
    if (decks[i].id === deckId) {
      return i;
    }
  }
  return null;
}

function findDeck(callback: (deck: Deck) => boolean): Deck | undefined {
  return decks.filter(callback)[0];
}

function importDeck(deckToImport: string | DeckData): Promise<Deck | undefined> {
  return new Promise<DeckData>(function (resolve, reject) {
    if (typeof deckToImport === 'string') {
      const deckInfo = availableDecks.find(deck => deck.uid === deckToImport);

      if (deckInfo) {
        resolve(downloadDeck(deckInfo.uid));
      } else {
        reject(Error(`Deck "${deckToImport}" not found.`));
      }
    } else {
      resolve(deckToImport);
    }
  }).then(function (deckData) {
    return storage.transaction(function () {
      const deck = createDeck(generateNewId(), deckData);
      const cards = deckData.cards.map(function (cardData, cardId) {
        return new Card(cardId, cardData[0], cardData[1]);
      });

      decks.push(deck);
      storage.store(StorageKeys.DECKS, decks);
      storeCards(cards, deck.id);
      return utils.copyData(deck);
    });
  }).catch(e => {
    console.error(e);
    return undefined;
  });
}

function storeCards(cards: Card[], deckId?: number): void {
  const serializedCards = cards.map(function (card) {
    return card.serialize();
  });
  const resolvedDeckId = deckId === undefined ? selectedDeck : deckId;
  if (resolvedDeckId === null || resolvedDeckId === undefined) {
    throw new Error('Cannot store cards without a deck ID');
  }
  storage.store(StorageKeys.DECK_PREFIX + resolvedDeckId, serializedCards);
}

function loadCards(deckId: number): Card[] {
  const serializedCards = storage.load<CardDto[]>(StorageKeys.DECK_PREFIX + deckId);
  if (!serializedCards) {
    return [];
  }
  return serializedCards.map(function (serializedCard, cardId) {
    return Card.unserialize(cardId, serializedCard);
  });
}

function updateDeck(deck: Deck, deckData: DeckData): void {
  storage.transaction(function () {
    const index = indexCardsByContent(deck);

    decks = decks.map(function (d) {
      if (d.id === deck.id) {
        return createDeck(deck.id, deckData);
      }
      return d;
    });
    storage.store(StorageKeys.DECKS, decks);

    const cards = deckData.cards.map(function (cardData, cardId) {
      const front = cardData[0];
      const back = cardData[1];

      if (front in index && back in index[front]) {
        return Card.unserialize(cardId, index[front][back]);
      } else {
        return new Card(cardId, front, back);
      }
    });
    storeCards(cards, deck.id);
  });
}

function createDeck(deckId: number, deckData: DeckData): Deck {
  return {
    id: deckId,
    uid: deckData.uid,
    version: deckData.version,
    displayName: deckData.displayName,
    languageFront: deckData.languageFront,
    languageBack: deckData.languageBack,
    size: deckData.cards.length,
    pronunciations: createPronunciationIndex(deckData),
  };
}

function createPronunciationIndex(deckData: DeckData): Record<string, string[]> | undefined {
  if (!deckData.lexicon) {
    return undefined;
  }
  const pronunciations: Record<string, string[]> = {};
  for (const item of Object.values(deckData.lexicon.items)) {
    if (item.ipa?.length) {
      pronunciations[`${item.language}:${item.lemma}`] = item.ipa;
    }
  }
  return pronunciations;
}

type CardContentIndex = Record<string, Record<string, CardDto>>;

function indexCardsByContent(deck: Deck): CardContentIndex {
  const index: CardContentIndex = {};

  loadCards(deck.id).forEach(function (card) {
    if (!(card.front in index)) {
      index[card.front] = {};
    }
    index[card.front][card.back] = card.serialize();
  });
  return index;
}

function generateNewId(): number {
  let maxId = -1;
  for (let i = 0; i < decks.length; i++) {
    if (decks[i].id > maxId) {
      maxId = decks[i].id;
    }
  }
  return maxId + 1;
}

function getAvailableDecks(): Array<{ uid: string; displayName: string }> {
  return availableDecks.map(deckData => {
    return { uid: deckData.uid, displayName: deckData.displayName };
  });
}

function downloadDeck(uid: string): Promise<DeckData> {
  return fetch(`/decks/${uid}.json`, { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) {
        throw Error(`Failed to download deck "${uid}" (${response.status})`);
      }
      return response.json() as Promise<DeckData>;
    });
}

export default {
  selectDeck,
  findDeck,
  getSelectedDeck,
  getAvailableDecks,
  importDeck,
  storeCards,
  loadCards,
};
