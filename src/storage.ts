import Card from './Card';
import decks from './decks';
import events from './events';
import type { CardDto, Deck } from './types';

const NAMESPACE = 'mj.';
const BACKUP_PREFIX = 'bkp.';

let insideTransaction = false;

const migrations: Array<() => void> = [
  function () {
    const storedDecks = load<Deck[]>('decks') || [];
    for (const deckId in storedDecks) {
      if (Object.prototype.hasOwnProperty.call(storedDecks, deckId)) {
        const deck = storedDecks[deckId as unknown as number];
        if (deck.displayName === 'Swedish / English') {
          deck.uid = 'top-sv-en';
          deck.languageFront = 'sv';
          deck.languageBack = 'en';
        }
      }
    }
    store('decks', storedDecks);
    store('topScores', load('topScores') || []);
  },
  function () {
    const storedDecks = load<Deck[]>('decks');
    if (!storedDecks) {
      return;
    }
    storedDecks.forEach(function (deck) {
      const cards: Card[] = [];
      for (let cardId = 0; cardId < deck.size; cardId++) {
        const cardKey = 'd' + deck.id + 'c' + cardId;
        const cardData = load<CardDto>(cardKey);
        if (cardData) {
          const card = Card.unserialize(cardId, cardData);
          cards.push(card);
          remove(cardKey);
        }
      }
      decks.storeCards(cards, deck.id);
    });
  },
];

function setup(): Promise<void> {
  rollback();

  let modelVersion = load<number>('modelVersion') || 0;
  console.log('storage model v' + modelVersion);
  while (modelVersion < migrations.length) {
    console.log('migrating to version ' + (modelVersion + 1) + '...');
    transaction(function () {
      migrations[modelVersion]();
      modelVersion++;
      store('modelVersion', modelVersion);
    });
    console.log('successfully migrated to v' + modelVersion);
  }
  return events.trigger('storageReady', null, true);
}

function store<T>(key: string, value: T): void {
  const fullKey = NAMESPACE + key;
  const serializedValue = JSON.stringify(value);

  if (insideTransaction) {
    backupItem(fullKey);
  }
  localStorage.setItem(fullKey, serializedValue);
}

function load<T = unknown>(key: string): T | null {
  const item = localStorage.getItem(NAMESPACE + key);
  return item === null ? null : JSON.parse(item) as T;
}

function remove(key: string): void {
  const fullKey = NAMESPACE + key;

  if (insideTransaction) {
    backupItem(fullKey);
  }
  localStorage.removeItem(fullKey);
}

function transaction<T>(callback: () => T): T {
  insideTransaction = true;
  try {
    const returnValue = callback();
    commit();
    return returnValue;
  } catch (e) {
    rollback();
    throw e;
  } finally {
    insideTransaction = false;
  }
}

function commit(): void {
  allBackupKeys().forEach(function (backupKey) {
    localStorage.removeItem(backupKey);
  });
}

function rollback(): void {
  allBackupKeys().forEach(function (backupKey) {
    restoreItem(backupKey);
  });
}

function backupItem(fullKey: string): void {
  const backupKey = BACKUP_PREFIX + fullKey;

  if (localStorage.getItem(backupKey) === null) {
    const value = localStorage.getItem(fullKey);
    localStorage.setItem(backupKey, JSON.stringify(value));
  }
}

function restoreItem(backupKey: string): void {
  const fullKey = backupKey.substr(BACKUP_PREFIX.length);
  const rawValue = localStorage.getItem(backupKey);

  if (rawValue !== null) {
    const value = JSON.parse(rawValue) as string | null;

    if (value === null) {
      localStorage.removeItem(fullKey);
    } else {
      localStorage.setItem(fullKey, value);
    }
    localStorage.removeItem(backupKey);
  }
}

function allBackupKeys(): string[] {
  return Object.keys(localStorage).filter(function (key) { return startsWith(key, BACKUP_PREFIX); });
}

function startsWith(string: string, prefix: string): boolean {
  if (string.length < prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (string[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}

function importData(stringifiedData: string, clear = false): void {
  const data = JSON.parse(stringifiedData) as Record<string, string>;

  if (clear) {
    localStorage.clear();
  }
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      localStorage.setItem(key, data[key]);
    }
  }
}

function exportData(includeBackups = true): string {
  const keys = Object.keys(localStorage).filter(function (key) {
    return startsWith(key, NAMESPACE) || (includeBackups && startsWith(key, BACKUP_PREFIX));
  });
  const data: Record<string, string> = {};

  keys.sort();
  keys.forEach(function (key) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  });
  return JSON.stringify(data);
}

export default {
  setup,
  store,
  load,
  remove,
  transaction,
  importData,
  exportData,
};
