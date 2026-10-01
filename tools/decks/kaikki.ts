export interface KaikkiSound {
  ipa?: string;
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
}

/** True when a sense only records an inflected form of another lemma. */
export function isInflectionSense(sense: KaikkiSense): boolean {
  return (sense.tags ?? []).includes('form-of') || (sense.form_of?.length ?? 0) > 0;
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
