export interface KaikkiSound {
  ipa?: string;
}

export interface KaikkiSense {
  links?: unknown[];
  glosses?: string[];
}

export interface KaikkiEntry {
  lang_code?: string;
  word?: string;
  senses?: KaikkiSense[];
  sounds?: KaikkiSound[];
}

export interface KellyFrequencyEntry {
  word: string;
}

export interface KellyFile {
  full_list: KellyFrequencyEntry[];
}
