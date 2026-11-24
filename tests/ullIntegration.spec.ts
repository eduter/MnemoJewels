// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { CardDto } from "../src/types";
const mock = vi.hoisted(() => ({
  signals: new Map<
    string,
    {
      knownSeed: string | null;
      againId: string | null;
      lastAgain: number;
      lastReview: number;
      due: number;
      priority: number;
    }
  >(),
  listeners: [] as (() => void)[],
  record: vi.fn(async () => {}),
}));
vi.mock("../src/ull", () => ({
  ull: {
    signal: (front: string, back: string) =>
      mock.signals.get(JSON.stringify([front, back])) ?? {
        knownSeed: null,
        againId: null,
        lastAgain: 0,
        lastReview: 0,
        due: 0,
        priority: 0,
      },
    subscribe: (fn: () => void) => mock.listeners.push(fn),
    recordMatch: mock.record,
    autoSync: async () => null,
  },
}));
vi.mock("../src/game", () => ({
  default: { getScopeSize: () => 300, getDifficulty: () => 0.3 },
}));
let cards: typeof import("../src/cards").default,
  events: typeof import("../src/events").default;
function stored(): CardDto[] {
  return JSON.parse(localStorage.getItem("mj.deck.1")!);
}
function update(again: string | null) {
  for (const back of ["book", "volume"])
    mock.signals.set(JSON.stringify(["книга", back]), {
      knownSeed: "seed:книга",
      againId: again,
      lastAgain: Date.now() - 300000,
      lastReview: Date.now() - 86400000,
      due: Date.now() + 86400000,
      priority: again ? 100 : 0,
    });
  mock.listeners.forEach((fn) => fn());
  cards.getStatesStats();
}
beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  mock.signals.clear();
  mock.listeners.length = 0;
  mock.record.mockClear();
  const pairs = [
    ["книга", "book"],
    ["книга", "volume"],
    ["дом", "house"],
    ["вода", "water"],
  ];
  localStorage.setItem("mj.modelVersion", "2");
  localStorage.setItem(
    "mj.decks",
    JSON.stringify([
      {
        id: 1,
        displayName: "ULL test",
        size: pairs.length,
        uid: "ull-test",
        version: 1,
        languageFront: "ru",
        languageBack: "en",
      },
    ]),
  );
  localStorage.setItem("mj.selectedDeck", "1");
  localStorage.setItem(
    "mj.deck.1",
    JSON.stringify(
      pairs.map(([ft, bk]) => ({ ft, bk, ea: 2.5, st: 1, lr: null, nr: null })),
    ),
  );
  cards = (await import("../src/cards")).default;
  events = (await import("../src/events")).default;
  await (await import("../src/storage")).default.setup();
});
describe("ULL state integration", () => {
  it("initializes every matching pair without inventing a real match or repetition", () => {
    update(null);
    const initialized = stored().filter((c) => c.ft === "книга");
    expect(initialized.map((c) => c.st)).toEqual([3, 3]);
    expect(
      initialized.every(
        (c) => c.lr === null && c.ul?.knownSeed === "seed:книга",
      ),
    ).toBe(true);
    expect(mock.record).not.toHaveBeenCalled();
  });
  it("forces all matching pairs to lapse and preserves it across flashcard recovery", () => {
    update("again-a");
    expect(
      stored()
        .filter((c) => c.ft === "книга")
        .map((c) => c.st),
    ).toEqual([4, 4]);
    update("again-a");
    expect(
      stored()
        .filter((c) => c.ft === "книга")
        .map((c) => c.st),
    ).toEqual([4, 4]);
    expect(
      stored()
        .filter((c) => c.ft !== "книга")
        .map((c) => c.st),
    ).toEqual([1, 1]);
  });
  it("can undo the external lapse without losing the baseline known state", () => {
    update(null);
    update("again-a");
    update(null);
    expect(
      stored()
        .filter((c) => c.ft === "книга")
        .map((c) => c.st),
    ).toEqual([3, 3]);
  });
  it("emits credit only for an existing qualifying match and preserves other pairs", async () => {
    update("again-a");
    const group = cards.createNewGroup(2),
      selected = group.find((c) => c.front === "книга") ?? group[0];
    await events.trigger("match", {
      cardId: selected.id,
      cardsInGroup: group,
      thinkingTime: 2000,
    });
    expect(mock.record).toHaveBeenCalledWith(
      selected.front,
      selected.back,
      true,
    );
    await events.trigger("exitApp");
    const other = stored().find(
      (c) => c.ft === "книга" && c.bk !== selected.back,
    );
    if (selected.front === "книга") expect(other!.st).toBe(4);
  });
  it("does not emit credit after an answer is revealed or for the last pair", async () => {
    const group = cards.createNewGroup(2),
      first = group[0];
    await events.trigger("match", {
      cardId: first.id,
      cardsInGroup: group,
      correctedCards: [first.id],
      thinkingTime: 2000,
    });
    const last = group[1];
    await events.trigger("match", {
      cardId: last.id,
      cardsInGroup: [last],
      thinkingTime: 2000,
    });
    expect(mock.record).not.toHaveBeenCalled();
  });
});
