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

export type TranslationSource = 'link' | 'gloss';

export interface SenseTranslation {
  value: string;
  sources: Set<TranslationSource>;
}

export interface TranslationsForSenseOptions {
  russianLemma?: string;
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
  if (!isTranslationShape(display)) return null;
  return normalizeTranslation(display);
}

export function shouldRejectHeuristicGloss(russianLemma: string, englishLemma: string): boolean {
  const english = englishLemma.toLowerCase();
  const allowedPos = VOCABULARY_POS_TRANSLATIONS.get(russianLemma.toLowerCase());
  if (allowedPos === english) return false;

  if (russianLemma.length === 1 && (english === 'letter' || english === 'alphabet')) {
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

export function shouldRejectTranslation(russianLemma: string, englishLemma: string): boolean {
  return shouldRejectHeuristicGloss(russianLemma, englishLemma);
}

export function translationsForSense(
  sense: KaikkiSense,
  { russianLemma = '', englishHeadwords, allowGlossFallback = true }: TranslationsForSenseOptions = {},
): SenseTranslation[] {
  const byValue = new Map<string, SenseTranslation>();

  for (const link of sense.links ?? []) {
    const normalized = englishFromSenseLink(link);
    if (!normalized) continue;
    if (englishHeadwords && !englishHeadwords.has(normalized)) continue;
    if (shouldRejectHeuristicGloss(russianLemma, normalized)) continue;
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
        && !shouldRejectHeuristicGloss(russianLemma, normalized)
      ) {
        const record = byValue.get(normalized) ?? { value: normalized, sources: new Set<TranslationSource>() };
        record.sources.add('gloss');
        byValue.set(normalized, record);
      }
    }
  }

  return [...byValue.values()].slice(0, 4);
}
