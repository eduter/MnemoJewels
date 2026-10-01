import type { KaikkiSense } from './kaikki.ts';

export const VOCABULARY_POS_TRANSLATIONS = new Map<string, string>([
  ['глагол', 'verb'],
  ['предлог', 'preposition'],
  ['прилагательное', 'adjective'],
  ['наречие', 'adverb'],
  ['существительное', 'noun'],
  ['местоимение', 'pronoun'],
  ['союз', 'conjunction'],
  ['междометие', 'interjection'],
  ['числительное', 'numeral'],
  ['причастие', 'participle'],
  ['алфавит', 'alphabet'],
  ['азбука', 'alphabet'],
  ['буква', 'letter'],
]);

const DISALLOWED_LINK_PREFIXES = /^(w:|Appendix:|Category:|Thesaurus:|File:|MediaWiki:)/i;

// Wiktionary sense links point at other entries on the same page. A translation
// link points at the English entry (a plain self-link, or an explicit `#English`
// fragment); a link into another language section (e.g. `de#Spanish`) is a
// "see also"-style cross-reference, not a translation, and must not become a card
// back. Topic labels (`law#English` alongside a `(law)` gloss) are handled
// separately, since they do carry an English fragment.
const NON_ENGLISH_LINK_LANGUAGES = new Set([
  'spanish', 'french', 'italian', 'portuguese', 'russian', 'german', 'dutch', 'catalan',
  'latin', 'romanian', 'galician', 'occitan', 'sardinian', 'chinese', 'japanese', 'korean',
  'arabic', 'hebrew', 'persian', 'hindi', 'ukrainian', 'polish', 'czech', 'slovak',
  'serbo-croatian', 'croatian', 'serbian', 'bulgarian', 'greek', 'turkish', 'finnish',
  'hungarian', 'swedish', 'danish', 'norwegian', 'icelandic', 'irish', 'welsh', 'breton',
  'basque', 'quechua', 'tagalog', 'translingual', 'ancient', 'middle', 'old', 'classical',
  'esperanto', 'nahuatl', 'navajo', 'kotava', 'ido', 'interlingua', 'volapük', 'sanskrit',
  'pali', 'lithuanian', 'latvian', 'estonian', 'slovene', 'slovenian', 'macedonian',
  'belarusian', 'albanian', 'georgian', 'armenian', 'azerbaijani', 'kazakh', 'uzbek',
]);

/** Language section a `word#Language` link target points at, if any. */
function linkFragmentLanguage(target: string): string | null {
  const hash = target.indexOf('#');
  if (hash === -1) return null;
  const fragment = target.slice(hash + 1).split(/[_:/]/, 1)[0].trim().toLowerCase();
  return fragment || null;
}

export type TranslationSource = 'link' | 'gloss';

export interface SenseTranslation {
  value: string;
  sources: Set<TranslationSource>;
}

export interface TranslationsForSenseOptions {
  frontLemma?: string;
  englishHeadwords?: Set<string>;
  allowGlossFallback?: boolean;
}

export function normalizeTranslation(value: string): string {
  return value.trim().toLowerCase().replace(/^to\s+/, '');
}

export function isTranslationShape(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= 45
    && /^[A-Za-z][A-Za-z '-]*$/.test(value)
    && !/^(Appendix|Category|Thesaurus|Wiktionary)$/i.test(value);
}

export function englishFromSenseLink(link: unknown): string | null {
  if (!Array.isArray(link) || typeof link[0] !== 'string') return null;
  const display = link[0];
  const target = typeof link[1] === 'string' ? link[1] : display;
  if (DISALLOWED_LINK_PREFIXES.test(target)) return null;
  const base = target.split('#')[0];
  if (/[а-яё]/iu.test(base)) return null;
  // `word#Language` links the entry in another language section; the display is
  // that language's spelling, not an English translation.
  const language = linkFragmentLanguage(target);
  if (language && NON_ENGLISH_LINK_LANGUAGES.has(language)) return null;
  if (!isTranslationShape(display)) return null;
  return normalizeTranslation(display);
}

export function shouldRejectHeuristicGloss(frontLemma: string, englishLemma: string): boolean {
  const english = englishLemma.toLowerCase();
  const allowedPos = VOCABULARY_POS_TRANSLATIONS.get(frontLemma.toLowerCase());
  if (allowedPos === english) return false;

  if (frontLemma.length === 1 && (english === 'letter' || english === 'alphabet')) {
    return true;
  }
  if (/^demonstrative\b/.test(english) || english === 'personal pronoun') {
    return true;
  }
  if (/\bidiomatic\b/.test(english)) {
    return true;
  }
  if (/^used (as|with|before|to|in)\b/.test(english)) {
    return true;
  }
  if (/\bcontent clause\b/.test(english) || english === 'relative clause') {
    return true;
  }
  if (/^(nominative|accusative|dative|genitive|instrumental|prepositional|vocative|locative) case$/.test(english)) {
    return true;
  }
  if (/^(pronoun|determiner|noun|verb|adjective|adverb|conjunction|interjection|particle|numeral|article|prefix|suffix|auxiliary)$/.test(english)) {
    return true;
  }
  return false;
}

export function shouldRejectTranslation(frontLemma: string, englishLemma: string): boolean {
  return shouldRejectHeuristicGloss(frontLemma, englishLemma);
}

export function translationsForSense(
  sense: KaikkiSense,
  { frontLemma = '', englishHeadwords, allowGlossFallback = true }: TranslationsForSenseOptions = {},
): SenseTranslation[] {
  const byValue = new Map<string, SenseTranslation>();
  const topics = new Set((sense.topics ?? []).map(topic => topic.toLowerCase()));
  const glossWords = new Set(
    (sense.glosses ?? []).join(' ').toLowerCase().match(/[a-z'’-]+/g) ?? [],
  );

  for (const link of sense.links ?? []) {
    const normalized = englishFromSenseLink(link);
    if (!normalized) continue;
    // A topic label such as `law` (gloss `(law) party`) is a subject tag, not a
    // translation; keep it only when the word is genuinely part of the gloss.
    if (topics.has(normalized) && !glossWords.has(normalized)) continue;
    if (englishHeadwords && !englishHeadwords.has(normalized)) continue;
    if (shouldRejectHeuristicGloss(frontLemma, normalized)) continue;
    const record = byValue.get(normalized) ?? { value: normalized, sources: new Set<TranslationSource>() };
    record.sources.add('link');
    byValue.set(normalized, record);
  }

  if (allowGlossFallback && !byValue.size && typeof sense.glosses?.[0] === 'string') {
    const fallback = sense.glosses[0].split(/[;,([]/, 1)[0].trim();
    if (isTranslationShape(fallback)) {
      const normalized = normalizeTranslation(fallback);
      if (
        (!englishHeadwords || englishHeadwords.has(normalized))
        && !shouldRejectHeuristicGloss(frontLemma, normalized)
      ) {
        const record = byValue.get(normalized) ?? { value: normalized, sources: new Set<TranslationSource>() };
        record.sources.add('gloss');
        byValue.set(normalized, record);
      }
    }
  }

  return [...byValue.values()].slice(0, 4);
}
