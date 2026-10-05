// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CardDto, Deck, DeckData } from '../src/types';

const DECK_ID = 1;
const UID = 'top-sv-en';
const STORED_VERSION = 1;
const AVAILABLE_VERSION = 2;

let events: typeof import('../src/events').default;
let decks: typeof import('../src/decks').default;
let storage: typeof import('../src/storage').default;
let fetchMock: ReturnType<typeof vi.fn>;
let resolveFetch: (response: unknown) => void;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  seedStorage();

  resolveFetch = () => {};
  fetchMock = vi.fn(() => new Promise(resolve => { resolveFetch = resolve; }));
  vi.stubGlobal('fetch', fetchMock);

  events = (await import('../src/events')).default;
  decks = (await import('../src/decks')).default;
  storage = (await import('../src/storage')).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function seedStorage(): void {
  const cards: CardDto[] = [];
  for (let index = 0; index < 20; index++) {
    cards.push({ ft: `old-front-${index}`, bk: `old-back-${index}`, ea: 2.5, st: 1, lr: null, nr: null });
  }
  const deck: Deck = {
    id: DECK_ID,
    displayName: 'Test deck',
    size: cards.length,
    uid: UID,
    version: STORED_VERSION,
    languageFront: 'sv',
    languageBack: 'en',
  };
  localStorage.setItem('mj.decks', JSON.stringify([deck]));
  localStorage.setItem('mj.deck.' + DECK_ID, JSON.stringify(cards));
  localStorage.setItem('mj.selectedDeck', JSON.stringify(DECK_ID));
  // Skip migrations: the seeded storage is already at the current model version.
  localStorage.setItem('mj.modelVersion', JSON.stringify(2));
}

function updatedDeckData(): DeckData {
  return {
    uid: UID,
    displayName: 'Test deck',
    version: AVAILABLE_VERSION,
    languageFront: 'sv',
    languageBack: 'en',
    cards: [
      ['new-front-0', 'new-back-0'],
      ['new-front-1', 'new-back-1'],
    ],
  };
}

function storedDeck(): Deck {
  return (JSON.parse(localStorage.getItem('mj.decks')!) as Deck[])[0];
}

function storedCards(): CardDto[] {
  return JSON.parse(localStorage.getItem('mj.deck.' + DECK_ID)!) as CardDto[];
}

// Lets the fetch -> response.json() -> apply microtask chain settle.
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

function respondWith(deckData: DeckData): void {
  resolveFetch({ ok: true, json: () => Promise.resolve(deckData) });
}

describe('deck updates', () => {
  it('does not block startup while a deck update is in flight', async () => {
    await storage.setup();

    // setup resolved even though the update fetch has not answered yet.
    expect(fetchMock).toHaveBeenCalled();
    expect(decks.getSelectedDeck()).toMatchObject({ uid: UID, version: STORED_VERSION });
  });

  it('applies an update in the background when no run is in progress', async () => {
    const selectedVersions: number[] = [];
    events.bind('deckSelected', eventData => {
      selectedVersions.push((eventData as { deck: Deck }).deck.version ?? 0);
    });

    await storage.setup();
    respondWith(updatedDeckData());
    await flush();

    expect(storedDeck().version).toBe(AVAILABLE_VERSION);
    expect(storedCards().map(card => card.ft)).toEqual(['new-front-0', 'new-front-1']);
    expect(selectedVersions).toContain(AVAILABLE_VERSION);
  });

  it('defers persisting an update for the selected deck while a run is in progress', async () => {
    await storage.setup();
    events.trigger('gameStart');
    respondWith(updatedDeckData());
    await flush();

    expect(storedDeck().version).toBe(STORED_VERSION);
    expect(storedCards()[0].ft).toBe('old-front-0');
  });

  it('defers persisting an update while the app is shutting down', async () => {
    await storage.setup();
    events.trigger('exitApp', null, true);
    respondWith(updatedDeckData());
    await flush();

    expect(storedDeck().version).toBe(STORED_VERSION);
  });

  it('keeps working with the stored deck when the update download fails', async () => {
    await storage.setup();
    resolveFetch(Promise.reject(new Error('offline')));
    await flush();

    expect(storedDeck().version).toBe(STORED_VERSION);
    expect(decks.getSelectedDeck()).toMatchObject({ uid: UID, version: STORED_VERSION });
  });
});
