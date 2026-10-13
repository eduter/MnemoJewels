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
    !isInflectionSense(sense)
    && (sense.glosses?.length ?? 0) > 0
    && !(sense.tags ?? []).some(tag => NONCURRENT_TAGS.has(tag)),
  );
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
