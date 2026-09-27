// Human-readable language names for the learner prompt, keyed by the ISO 639-1
// codes a deck declares in `languageFront` / `languageBack`.
//
// Requesting a language name matters for recognition, not generation: Jev loses
// accuracy as irrelevant context grows, so the prompt should name the languages
// compactly and only the languages actually on the deck. An unknown code falls
// back to the bare code rather than guessing a name.

const LANGUAGE_NAMES: Record<string, string> = {
  ru: 'Russian',
  en: 'English',
  sv: 'Swedish',
  no: 'Norwegian',
  nb: 'Norwegian',
  nn: 'Norwegian',
  pt: 'Portuguese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  nl: 'Dutch',
  da: 'Danish',
  pl: 'Polish',
  uk: 'Ukrainian',
  cs: 'Czech',
  tr: 'Turkish',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  ar: 'Arabic',
  he: 'Hebrew',
  fi: 'Finnish',
  el: 'Greek',
  hu: 'Hungarian',
  ro: 'Romanian',
  bg: 'Bulgarian',
  sr: 'Serbian',
  hr: 'Croatian',
  sk: 'Slovak',
  sl: 'Slovenian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  et: 'Estonian',
  is: 'Icelandic',
  ca: 'Catalan',
  gl: 'Galician',
  eu: 'Basque',
  cy: 'Welsh',
  ga: 'Irish',
  hi: 'Hindi',
  fa: 'Persian',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  sw: 'Swahili',
  af: 'Afrikaans',
};

export function languageName(code: string | undefined, fallback = 'the source language'): string {
  if (!code) return fallback;
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}
