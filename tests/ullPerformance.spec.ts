// @vitest-environment jsdom
import { it, expect, beforeAll, vi } from "vitest";
import { stdout } from "node:process";
import russian from "../public/decks/top-ru-en.json";
const control = vi.hoisted(() => ({ scope: 300, target: false }));
vi.mock("../src/game", () => ({
  default: { getScopeSize: () => control.scope, getDifficulty: () => 0.3 },
}));
vi.mock("../src/ull", () => ({
  ull: {
    signal: (front: string) => ({
      knownSeed: null,
      againId: null,
      lastAgain: 0,
      lastReview: 0,
      due: 0,
      priority:
        control.target && ["книга", "дом", "вода"].includes(front) ? 20 : 0,
    }),
    subscribe: () => {},
    recordMatch: async () => {},
    autoSync: async () => null,
  },
}));
let cards: typeof import("../src/cards").default,
  events: typeof import("../src/events").default;
beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "group").mockImplementation(() => {});
  vi.spyOn(console, "groupEnd").mockImplementation(() => {});
  vi.spyOn(Math, "random").mockReturnValue(0.1);
  const now = Date.now();
  localStorage.setItem("mj.modelVersion", "2");
  localStorage.setItem(
    "mj.decks",
    JSON.stringify([
      {
        ...russian,
        id: 1,
        cards: undefined,
        size: russian.cards.length,
        uid: "benchmark-russian",
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
      russian.cards.map(([ft, bk]) => ({
        ft,
        bk,
        st: 3,
        ea: 2.5,
        lr: now - 30 * 86400000,
        nr: now,
      })),
    ),
  );
  cards = (await import("../src/cards")).default;
  events = (await import("../src/events")).default;
  await (await import("../src/storage")).default.setup();
});
for (const scope of [300, 1000, 2500])
  for (const target of [false, true])
    it(`Russian 6243 pairs · scope ${scope} · ${target ? "ULL targeted" : "ordinary"} selection`, async () => {
      control.scope = scope;
      control.target = target;
      const samples: number[] = [];
      for (let i = 0; i < 12; i++) {
        const start = performance.now();
        const group = cards.createNewGroup(3);
        samples.push(performance.now() - start);
        expect(group).toHaveLength(3);
        await events.trigger("gameOver", {
          points: 0,
          gameStart: 0,
          gameEnd: 1,
        });
      }
      samples.sort((a, b) => a - b);
      stdout.write(
        `ULL selection scope=${scope} targeted=${target} p50=${samples[6].toFixed(1)}ms max=${samples.at(-1)!.toFixed(1)}ms\n`,
      );
    }, 30000);
