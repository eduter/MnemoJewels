export type State = 1 | 2 | 3 | 4;

export type Timestamp = number;

export interface CardDto {
  ft: string;
  bk: string;
  ea: number;
  st: State;
  lr: number | null;
  nr: number | null;
  ms?: boolean;
}

export interface Deck {
  id: number;
  displayName: string;
  size: number;
  languageFront?: string;
  languageBack?: string;
  uid?: string;
  version?: number;
}

export interface DeckData {
  displayName: string;
  cards: [string, string][];
  languageFront?: string;
  languageBack?: string;
  uid?: string;
  version?: number;
}

export interface AvailableDeckMeta {
  uid: string;
  displayName: string;
  version: number;
}

export interface StateStat {
  state: string;
  count: number;
}

export interface TopScore {
  points: number;
  deckId: number;
  start: Timestamp;
  end: Timestamp;
}

export interface CardRef {
  id: number;
}

export interface MatchEventData {
  cardId: number;
  cardsInGroup: CardRef[];
  thinkingTime: number;
}

export interface MismatchEventData {
  mismatchedCards: number[];
  cardsInGroup: CardRef[];
  thinkingTime: number;
}

export interface GameOverEventData {
  score: number;
  gameStart: Timestamp;
  gameEnd: Timestamp;
}

export interface ScoreUpEventData {
  points: number;
  reason: 'match' | 'streakBonus';
  streakLength?: number;
  bonus?: string;
}

export interface DeckSelectedEventData {
  deck: Deck;
}

export interface LevelUpEventData {
  level: number;
}

export interface JewelSelection {
  row: number;
  col: number;
}

export interface ScreenModule {
  setup?: () => void;
  update?: () => void;
}

export interface WordDiff {
  add: [string, string][];
  remove: string[];
}
