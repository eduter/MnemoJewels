export interface KaikkiSound {
  ipa?: string;
}

export interface KaikkiTranslation {
  lang_code?: string;
  word?: string;
  sense?: string;
  tags?: string[];
}

export interface KaikkiSense {
  links?: unknown[];
  glosses?: string[];
  /** The gloss text before label stripping, e.g. `(obsolete) other, another`.
   *  The leading parenthetical is where Wiktionary records a sense's register;
   *  `glosses` has it removed. */
  raw_glosses?: string[];
  tags?: string[];
  topics?: string[];
  form_of?: unknown[];
}

export interface KaikkiEntry {
  lang_code?: string;
  word?: string;
  pos?: string;
  senses?: KaikkiSense[];
  sounds?: KaikkiSound[];
  /** Target-language renderings recorded on an English entry. Only English
   *  Wiktionary entries carry this; other languages express translations as
   *  sense links instead. */
  translations?: KaikkiTranslation[];
}

/** True when a sense only records an inflected form of another lemma. */
export function isInflectionSense(sense: KaikkiSense): boolean {
  return (sense.tags ?? []).includes('form-of') || (sense.form_of?.length ?? 0) > 0;
}

/** True when a sense is a redirect to another spelling or lemma ("standard
 *  spelling of …", "alternative form of …"). Such a sense carries no translation
 *  of its own: its links are region labels (`Switzerland`) and cross-references
 *  to the target spelling, so using either would put `switzerland` on a card for
 *  `gross`.
 *
 *  Only the gloss phrase is a reliable signal: `alt-of` also tags contractions
 *  (`im`), clippings (`Ost`) and abbreviations (`Mio`), which do carry their own
 *  translation, and "alternative form of" tags live colloquial words (`nö`,
 *  `grad`) whose links are as usable as any other sense's. */
export function isRedirectSense(sense: KaikkiSense): boolean {
  const gloss = sense.glosses?.[0] ?? '';
  return /\b(?:standard|obsolete|former(?:ly standard)?|nonstandard|misspelling|alternative|letter-case)\s+spelling of\b/i.test(gloss)
    || /\bletter-case\s+form of\b/i.test(gloss);
}

/** True when a sense is a cross-reference to another spelling or form rather
 *  than a meaning of its own ("standard spelling of Straße", "alternative form
 *  of schloss"). Such a sense must not compete when choosing a lemma's canonical
 *  spelling: `schloß`/`Schloß` are the pre-reform spellings of `Schloss`, and
 *  the archaic `schloß` must not override the modern `Schloss`. */
export function isVariantSense(sense: KaikkiSense): boolean {
  if (isInflectionSense(sense)) return true;
  const gloss = sense.glosses?.[0] ?? '';
  return /\b(?:spelling|form)\s+of\b/i.test(gloss);
}

// Register tags marking a sense as not part of current standard usage. Such a
// sense should not, on its own, keep a spelling lowercase: `Frau` is a noun even
// though a rare slang pronoun `frau` also exists, whereas a plain `super`
// (colloquial but current) genuinely competes with the noun `Super`.
const NONCURRENT_TAGS = new Set([
  'rare', 'archaic', 'obsolete', 'dated', 'nonstandard', 'deprecated', 'misspelling',
  'slang', 'humorous', 'dialectal', 'literary',
]);

// Registers that mean the sense is no longer current standard usage, which a
// frequency-ranked beginner deck must not teach. `historical` is included: it
// names a thing that no longer exists (`légua`), so it is not vocabulary a
// learner can use. The borderline registers (`slang`, `humorous`, `dialectal`,
// `literary`) are deliberately excluded — they are current usage, just not
// neutral — so a label that mentions one is kept.
const OBSOLETE_REGISTERS = new Set([
  'obsolete', 'archaic', 'dated', 'rare', 'nonstandard', 'misspelling',
  'deprecated', 'historical',
]);

// Words that qualify a register without naming something else (`(now dated)`,
// `(very rare)`, `(chiefly historical)`). They are transparent, so a part built
// only from register words and these still counts as a bare register tag.
const REGISTER_QUALIFIERS = new Set(['now', 'chiefly', 'mainly', 'especially', 'very', 'mostly', 'sometimes']);

// Words that link registers into a conjunction or a choice: `(obsolete, poetic)`,
// `(obsolete or dialectal)`, `(historical and literary)`. A part whose every
// content word is a register counts even when the registers are joined this way,
// because Wiktionary's `or` between two registers means "either label may apply"
// — both are non-current — whereas `or` against a non-register (`dated or
// informal`) names a current alternative and is kept.
const REGISTER_CONJUNCTIONS = new Set(['or', 'and', 'also']);

// Registers that are current on their own (`(dialectal) tail` is kept, a
// dialectal word is still in use) but that do not rescue a sense when `or`/`and`
// pairs them with a non-current register: `(obsolete or dialectal)` and
// `(dated or dialectal)` are non-current, so the sense is dropped.
const NONCURRENT_WHEN_JOINED = new Set(['dialectal']);

/** Historical eras and places, which name a period rather than a current region
 *  or field. A label built only from these and registers (`(Early Modern,
 *  obsolete)`, `(historical, Ancient Rome)`) is non-current, like `historical`
 *  itself. */
const HISTORICAL_ERAS = [
  'early modern', 'ancient rome', 'ancient greece', 'middle ages', 'medieval', 'middle', 'ancient',
];

/** The comma-separated parts of a sense's leading register label, e.g.
 *  `(now chiefly Portugal, dated in Brazil)` -> `['now chiefly Portugal',
 *  'dated in Brazil']`. Returns null when the sense has no leading parenthetical
 *  in its raw gloss. */
function registerLabelParts(sense: KaikkiSense): string[] | null {
  const raw = sense.raw_glosses?.[0];
  if (typeof raw !== 'string') return null;
  const match = /^\s*\(([^)]*)\)/.exec(raw);
  if (!match) return null;
  return match[1].split(',').map(part => part.trim().toLowerCase()).filter(Boolean);
}

/** True when a label part names only non-current usage: registers (joined by
 *  `or`/`and`/`also`), transparent qualifiers, and historical eras. A part that
 *  also names a region, a field, or a current register (`dated in Brazil`,
 *  `historical, measure`, `dated or informal`) is not a bare register tag. */
function isRegisterOnlyPart(part: string): boolean {
  // Eras are multi-word (`early modern`, `ancient rome`), so strip the longest
  // phrase first before splitting the remainder into words.
  let rest = part;
  for (const era of [...HISTORICAL_ERAS].sort((a, b) => b.length - a.length)) {
    rest = rest.split(era).join(' ');
  }
  const words = rest.split(/[^a-z]+/).filter(Boolean);
  const registers = words.filter(word => !REGISTER_QUALIFIERS.has(word) && !REGISTER_CONJUNCTIONS.has(word));
  if (!registers.length) return true;
  // Every register must be non-current, or be one (`dialectal`) that the label
  // pairs with a non-current register, which makes the whole label non-current.
  const joined = registers.length > 1;
  return registers.every(word =>
    OBSOLETE_REGISTERS.has(word) || (joined && NONCURRENT_WHEN_JOINED.has(word)));
}

/**
 * True when a sense is obsolete/archaic/dated/rare/historical and so must not
 * become a card on a frequency-ranked beginner deck (`al` -> "other" is only
 * recorded as obsolete Portuguese).
 *
 * The signal is the register label in `raw_glosses`, NOT `sense.tags`: Kaikki
 * copies labels from the head template onto every sense, so `mapa` "map" and
 * `juiz` "judge" are tagged `obsolete`/`dated` because of an obsolete *feminine*
 * or a dated gender variant, while the words themselves are perfectly current.
 *
 * Wiktionary separates labels with commas for conjunction and `or` for
 * alternatives, so the sense is stale when *any* comma-part names only
 * non-current usage: `(archaic, poetic)` is archaic, `(obsolete or dialectal)`
 * is obsolete-or-dialectal (both non-current), `(Early Modern, India)` names a
 * dead period. A part that offers a current alternative (`(dated or informal)`)
 * or names a region/field (`(Portugal, dated in Brazil)`, `(historical,
 * measure)`) keeps the sense.
 */
export function isObsoleteSense(sense: KaikkiSense): boolean {
  const parts = registerLabelParts(sense);
  if (!parts) return false;
  return parts.some(isRegisterOnlyPart);
}

/** True when an entry carries a sense that is a current, real word rather than an
 *  inflected form (an imperative, a preterite) or an obsolete/rare variant. Used
 *  to decide capitalization: an inflected or noncurrent lowercase entry does not
 *  compete with a capitalized noun, but a real lowercase word does (`arm` "poor"
 *  vs `Arm` "arm"). */
export function hasCompetingWordSense(entry: KaikkiEntry): boolean {
  return (entry.senses ?? []).some(sense =>
    !isVariantSense(sense)
    && (sense.glosses?.length ?? 0) > 0
    && !(sense.tags ?? []).some(tag => NONCURRENT_TAGS.has(tag)),
  );
}

/** True when every real sense of the entry is obsolete, so the word itself is not
 *  part of current usage (`vero`, `légua`, `al`). An entry with no real sense —
 *  only inflections or redirects (`is`, `esposa` the verb form) — is not
 *  "obsolete": it is a form, and the deck may still show it. */
export function isWhollyObsolete(entry: KaikkiEntry): boolean {
  const real = (entry.senses ?? []).filter(sense =>
    !isInflectionSense(sense) && !isRedirectSense(sense) && (sense.glosses?.length ?? 0) > 0);
  return real.length > 0 && real.every(isObsoleteSense);
}

// Tags marking a noun entry as a nominalization or abbreviation rather than a
// word with a meaning of its own. `gerund` is the nominalized-infinitive tag
// (`Essen` "eating" < `essen`), which a beginner does not meet as a separate
// noun.
const NOUN_FORM_TAGS = new Set(['gerund', 'abbreviation', 'initialism', 'acronym']);

// Glosses that describe the form rather than a meaning. `letter-case form of`
// is the capitalization-redirect family (`Du` "letter-case form of du").
const NOUN_FORM_GLOSS = /^(?:abbreviation|initialism|acronym|contraction|short for|ellipsis|letter-case form)\b/i;

// Register tags marking a use-mention sense: `Du` "the thou, the you (singular)"
// records the pronoun quoted as a word, not a noun with its own meaning.
const NOUN_MENTION_TAGS = new Set(['literally']);

/** True when a noun entry carries a sense that is its own meaning, rather than a
 *  nominalized verb (`Essen` "eating"), a capitalized abbreviation (`AM`), a
 *  redirect to another spelling (`Du` "letter-case form of du") or the word
 *  quoted as a noun (`Hin` "hin"). Used to decide whether a capitalized spelling
 *  is a distinct noun that deserves its own card next to a lowercase word of the
 *  same spelling (`morgen` "tomorrow" vs `Morgen` "morning"). */
export function hasRealNounSense(entry: KaikkiEntry): boolean {
  const word = (entry.word ?? '').toLowerCase();
  return (entry.senses ?? []).some(sense => {
    if (isVariantSense(sense)) return false;
    const tags = sense.tags ?? [];
    if (tags.some(tag => NOUN_FORM_TAGS.has(tag) || NOUN_MENTION_TAGS.has(tag))) return false;
    const gloss = sense.glosses?.[0] ?? '';
    if (!gloss || NOUN_FORM_GLOSS.test(gloss)) return false;
    // A gloss that only restates the headword ("Hin" -> "hin") is a mention.
    return gloss.trim().toLowerCase() !== word;
  });
}

/** IPA transcriptions carried by a Wiktionary entry's `sounds` array. */
export function ipaFromSounds(entry: KaikkiEntry, max = 3): string[] {
  const ipa: string[] = [];
  for (const sound of entry.sounds ?? []) {
    if (typeof sound.ipa === 'string' && !ipa.includes(sound.ipa)) ipa.push(sound.ipa);
    if (ipa.length >= max) break;
  }
  return ipa;
}

export interface KellyFrequencyEntry {
  word: string;
}

export interface KellyFile {
  full_list: KellyFrequencyEntry[];
}
