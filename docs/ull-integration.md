# ULL integration

This optional integration shares Russian learning signals with the separate ULL reviewer and Firefox watching extension. The MJ deck and gameplay remain intact. Open Settings, expand **Connect ULL learning**, and import a reviewer profile and journal or configure the same Dropbox App Folder app key.

Existing graduated flashcard knowledge seeds matching NEW/LEARNING pairs as KNOWN without inventing a real game repetition. A flashcard Again explicitly sets all matching pairs LAPSE, including pairs never played in MJ. A subsequent flashcard Good does not erase that lapse. Qualifying clean MJ matches resolve their own pair and emit a separate success event; elimination/revealed answers do not. MJ mismatches never emit flashcard scheduling changes.

External changes go through the live card owner and defer cards still on the board. Extra CardDto metadata records initialization, applied Again and an external scheduling anchor without changing actual MJ last-repetition history. Matching uses lowercased, stress-normalized exact words; ё and й remain distinct. Pair content supplies stable identity across deck updates.

When external signals exist, sixty percent of first-card selection attempts consider the twenty highest-priority eligible pairs. Normal selection and phonetic alternatives remain available. No profile means ordinary gameplay.

`src/ull-bridge.js` and its declaration are generated from `src/integration/mj-client.ts` in [unified-language-learning](https://github.com/eduter/unified-language-learning). Regenerate there with `npm run build:mj`, then copy both outputs from `dist-integration/` into MJ's `src/`. Vendoring this small client keeps MJ builds independent of an unpublished package and sibling checkout. See `ull-third-party-notices.txt` for dependency licenses.

Configuration and event data live in a separate IndexedDB store. Dropbox uses PKCE and immutable event batches. Actual account connection and Firefox Android tests remain outstanding; file transfer works without credentials. Keep Anki as the main reviewer until ULL's return gate passes.
