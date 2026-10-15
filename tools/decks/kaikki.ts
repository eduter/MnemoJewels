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
