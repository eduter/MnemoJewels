// Phonologically grounded IPA comparison.
//
// A naive per-character Levenshtein comparison of two IPA strings treats every
// allophone as a full mismatch: `r` vs `ɹ`, `ɒ` vs `ɐ`, `ɪ` vs `i`, `ʂ` vs `ʃ`,
// or a palatalization mark `ʲ` all cost as much as swapping in an unrelated
// sound. That is wrong for pronunciation-based mnemonic grouping, where a
// learner hears a Russian word and an English word as "the same sound" even
// when Wiktionary transcribes them with different symbols.
//
// Instead of comparing characters, each IPA segment (a base symbol plus its
// diacritics) is projected onto a small set of articulatory features, in the
// spirit of PanPhon (Mortensen et al., 2016) and the reduced sound classes used
// in ASJP-style phonetic alignment. The distance between two segments is a
// weighted Euclidean distance over those features, so near sounds are cheap and
// distant sounds saturate at a full substitution cost. Sequences are then
// aligned with a Needleman-Wunsch/Levenshtein recurrence using the graded
// substitution cost.
//
// The result stays on the same "roughly one unit per sound" scale as a plain
// edit distance so callers that bucket distances (card selection) keep working;
// the difference is that phonetic variation no longer counts as a whole sound.

/** Articulatory features of a single segment. Vowels and consonants share the
 *  struct so aligning across the two classes is well defined (syllabic differs,
 *  which alone makes a near-full substitution cost). */
interface SegmentFeatures {
  /** 1 for vowels, 0 for consonants. */
  syllabic: 0 | 1;
  /** Vowel tongue height, 0 (open) to 1 (close). */
  height: number;
  /** Vowel backness, 0 (front) to 1 (back). */
  backness: number;
  /** Vowel lip rounding, 0 unrounded, 1 rounded. */
  rounding: number;
  /** Consonant place of articulation, 0 (bilabial) to 1 (glottal). */
  place: number;
  /** Consonant manner, roughly ordered along the sonority scale. */
  manner: number;
  /** Consonant voicing, 0 voiceless, 1 voiced. */
  voice: number;
  /** Sibilant friction, 0 non-sibilant, 1 sibilant. */
  sibilant: number;
}

const FEATURE_WEIGHTS = {
  syllabic: 0.9,
  height: 0.55,
  backness: 0.5,
  rounding: 0.45,
  place: 0.55,
  manner: 0.5,
  voice: 0.45,
  sibilant: 0.3,
} as const;

const PLACE: Record<string, number> = {
  bilabial: 0.0, labiodental: 0.15, dental: 0.3, alveolar: 0.4,
  postalveolar: 0.5, retroflex: 0.55, alveolopalatal: 0.6, palatal: 0.7,
  velar: 0.8, uvular: 0.9, glottal: 1.0,
};

const MANNER: Record<string, number> = {
  stop: 0.0, affricate: 0.25, fricative: 0.55, nasal: 0.7,
  trill: 0.8, tap: 0.85, approximant: 0.9, lateral: 0.9,
};

function vowel(height: number, backness: number, rounding: number): SegmentFeatures {
  return { syllabic: 1, height, backness, rounding, place: 0, manner: 0, voice: 1, sibilant: 0 };
}

function consonant(
  place: keyof typeof PLACE,
  manner: keyof typeof MANNER,
  voice: 0 | 1,
  sibilant = 0,
): SegmentFeatures {
  return { syllabic: 0, height: 0, backness: 0, rounding: 0, place: PLACE[place], manner: MANNER[manner], voice, sibilant };
}

/** Base-symbol → articulatory features for the segments that occur in the
 *  shipped decks. Symbols outside this table cost a full substitution, which is
 *  the safe default for a genuinely unknown sound. */
const SEGMENTS: Record<string, SegmentFeatures> = {
  // Vowels
  a: vowel(0.0, 0.3, 0), ɐ: vowel(0.15, 0.5, 0), ɑ: vowel(0.0, 1.0, 0),
  ɒ: vowel(0.0, 1.0, 1), ɔ: vowel(0.3, 1.0, 1), ʌ: vowel(0.3, 1.0, 0),
  æ: vowel(0.2, 0.35, 0), ɛ: vowel(0.35, 0.4, 0), e: vowel(0.5, 0.4, 0),
  ɘ: vowel(0.5, 0.5, 0), ə: vowel(0.45, 0.5, 0), ᵊ: vowel(0.45, 0.5, 0),
  ɚ: vowel(0.45, 0.5, 0), ɜ: vowel(0.45, 0.55, 0), ɝ: vowel(0.45, 0.55, 0),
  ɞ: vowel(0.35, 0.55, 1), ɤ: vowel(0.5, 1.0, 0), i: vowel(1.0, 0.0, 0),
  ɪ: vowel(0.8, 0.15, 0), ɨ: vowel(0.85, 0.5, 0), ᵻ: vowel(0.8, 0.5, 0),
  ɯ: vowel(0.9, 1.0, 0), u: vowel(1.0, 1.0, 1), ʊ: vowel(0.8, 0.85, 1),
  ʉ: vowel(0.9, 0.5, 1), ɵ: vowel(0.6, 0.5, 1), o: vowel(0.6, 1.0, 1),
  y: vowel(1.0, 0.0, 1), ø: vowel(0.6, 0.2, 1), œ: vowel(0.4, 0.25, 1),
  // Stops and affricates
  p: consonant('bilabial', 'stop', 0), b: consonant('bilabial', 'stop', 1),
  t: consonant('alveolar', 'stop', 0), d: consonant('alveolar', 'stop', 1),
  ʈ: consonant('retroflex', 'stop', 0), ɖ: consonant('retroflex', 'stop', 1),
  k: consonant('velar', 'stop', 0), ɡ: consonant('velar', 'stop', 1),
  g: consonant('velar', 'stop', 1), c: consonant('palatal', 'stop', 0),
  ʔ: consonant('glottal', 'stop', 0),
  // Fricatives
  f: consonant('labiodental', 'fricative', 0), v: consonant('labiodental', 'fricative', 1),
  θ: consonant('dental', 'fricative', 0), ð: consonant('dental', 'fricative', 1),
  s: consonant('alveolar', 'fricative', 0, 1), z: consonant('alveolar', 'fricative', 1, 1),
  ʃ: consonant('postalveolar', 'fricative', 0, 1), ʒ: consonant('postalveolar', 'fricative', 1, 1),
  ʂ: consonant('retroflex', 'fricative', 0, 1), ʐ: consonant('retroflex', 'fricative', 1, 1),
  ɕ: consonant('alveolopalatal', 'fricative', 0, 1), ʑ: consonant('alveolopalatal', 'fricative', 1, 1),
  x: consonant('velar', 'fricative', 0), ɣ: consonant('velar', 'fricative', 1),
  χ: consonant('uvular', 'fricative', 0), ç: consonant('palatal', 'fricative', 0),
  h: consonant('glottal', 'fricative', 0), ɦ: consonant('glottal', 'fricative', 1),
  ʍ: consonant('velar', 'fricative', 0),
  // Nasals
  m: consonant('bilabial', 'nasal', 1), ɱ: consonant('labiodental', 'nasal', 1),
  n: consonant('alveolar', 'nasal', 1), ɳ: consonant('retroflex', 'nasal', 1),
  ɲ: consonant('palatal', 'nasal', 1), ŋ: consonant('velar', 'nasal', 1),
  // Liquids, glides, trills and taps
  r: consonant('alveolar', 'trill', 1), ʙ: consonant('bilabial', 'trill', 1),
  ɾ: consonant('alveolar', 'tap', 1),
  ɹ: consonant('alveolar', 'approximant', 1), ɻ: consonant('retroflex', 'approximant', 1),
  l: consonant('alveolar', 'lateral', 1), ɫ: consonant('alveolar', 'lateral', 1),
  j: consonant('palatal', 'approximant', 1), w: consonant('velar', 'approximant', 1),
  ʋ: consonant('labiodental', 'approximant', 1),
};

/** Diacritics that modify a base symbol rather than being a segment of their own. */
const DIACRITICS = new Set(['ʲ', 'ʰ', 'ʷ', '˞', 'ː', 'ˑ', '̃', 'ˀ', '̥', '̊', '̬', '̆', '̯', '̩', '̞', '̝', '̠', '̟', '̪', '̈', '̹', '̙', '̧']);

const DIACRITIC_COSTS: Record<string, number> = {
  'ʲ': 0.2, // palatalization
  'ʰ': 0.25, // aspiration
  'ʷ': 0.2, // labialization
  '˞': 0.25, // rhoticity
  'ː': 0.15, // length
  'ˑ': 0.1, // half length
  '̃': 0.2, // nasalization
  'ˀ': 0.3, // glottalization
  '̥': 0.15, // devoicing
  '̊': 0.15,
  '̯': 0.2, // non-syllabic
  '̩': 0.2, // syllabic
};

const DEFAULT_DIACRITIC_COST = 0.2;

/** Characters that carry no phonetic content for this comparison. */
const IGNORED = /[\/[\]().‿ˈˌ._\-⁽⁾]/gu;

function isDiacritic(character: string): boolean {
  return DIACRITICS.has(character) || /\p{M}/u.test(character);
}

// Alternative selection re-tokenizes and re-compares the same handful of IPA
// strings thousands of times per group, so every stage is memoized: the
// segmentation of a string, the cost of a segment pair, and the distance of a
// transcription pair. Caches are keyed by value for the small, bounded inputs
// (segments) and by object identity for the transcription arrays, which are
// owned by the loaded deck and dropped wholesale when it is unloaded.
const SEGMENTS_CACHE_LIMIT = 8192;
const segmentsCache = new Map<string, string[]>();

/**
 * Splits an IPA transcription into segments, attaching every following
 * diacritic (palatalization, length, nasalization, …) to its base symbol.
 * Results are cached per input string; callers must not mutate them.
 */
export function ipaSegments(ipa: string): string[] {
  const cached = segmentsCache.get(ipa);
  if (cached !== undefined) return cached;

  const cleaned = ipa
    .normalize('NFD')
    .toLowerCase()
    .replace(IGNORED, '')
    .replace(/[͜͡]/gu, '')
    .normalize('NFC');

  const segments: string[] = [];
  let current = '';
  for (const character of cleaned) {
    if (isDiacritic(character)) {
      current += character;
    } else {
      if (current) segments.push(current);
      current = character;
    }
  }
  if (current) segments.push(current);

  // A bounded cache so it cannot grow without limit; a real deck has only a few
  // hundred distinct transcription strings, far below the cap.
  if (segmentsCache.size >= SEGMENTS_CACHE_LIMIT) segmentsCache.clear();
  segmentsCache.set(ipa, segments);
  return segments;
}

const segmentIds = new Map<string, number>();
const segmentStrings: string[] = [];
const segmentIdCache = new WeakMap<string[], Int32Array>();

// Flattened `count x count` matrix of substitution costs between interned
// segments, filled lazily. NaN marks an uncomputed cell so a genuine zero cost
// (identical segments) is not confused with "missing".
let segmentPairCost = new Float64Array(0);
let segmentPairSize = 0;

function internSegment(segment: string): number {
  const existing = segmentIds.get(segment);
  if (existing !== undefined) return existing;

  const id = segmentStrings.length;
  segmentStrings.push(segment);
  segmentIds.set(segment, id);
  growSegmentPairMatrix(id + 1);
  return id;
}

function growSegmentPairMatrix(size: number): void {
  const next = new Float64Array(size * size).fill(NaN);
  for (let i = 0; i < segmentPairSize; i++) {
    for (let j = 0; j < segmentPairSize; j++) {
      next[i * size + j] = segmentPairCost[i * segmentPairSize + j];
    }
  }
  segmentPairCost = next;
  segmentPairSize = size;
}

function internedIds(segments: string[]): Int32Array {
  const cached = segmentIdCache.get(segments);
  if (cached !== undefined) return cached;

  const ids = new Int32Array(segments.length);
  for (let i = 0; i < segments.length; i++) ids[i] = internSegment(segments[i]);
  segmentIdCache.set(segments, ids);
  return ids;
}

function internedPairCost(leftId: number, rightId: number): number {
  const index = leftId * segmentPairSize + rightId;
  const cached = segmentPairCost[index];
  if (!Number.isNaN(cached)) return cached;

  const cost = computeSegmentDistance(segmentStrings[leftId], segmentStrings[rightId]);
  segmentPairCost[index] = cost;
  return cost;
}

function baseSymbol(segment: string): string {
  for (const character of segment) {
    if (!isDiacritic(character)) return character;
  }
  return segment;
}

function diacritics(segment: string): string[] {
  return [...segment].filter(isDiacritic);
}

function featureDistance(left: SegmentFeatures, right: SegmentFeatures): number {
  let sum = 0;
  sum += FEATURE_WEIGHTS.syllabic * (left.syllabic - right.syllabic) ** 2;
  if (left.syllabic === 1 && right.syllabic === 1) {
    sum += FEATURE_WEIGHTS.height * (left.height - right.height) ** 2
      + FEATURE_WEIGHTS.backness * (left.backness - right.backness) ** 2
      + FEATURE_WEIGHTS.rounding * (left.rounding - right.rounding) ** 2;
  } else if (left.syllabic === 0 && right.syllabic === 0) {
    sum += FEATURE_WEIGHTS.place * (left.place - right.place) ** 2
      + FEATURE_WEIGHTS.manner * (left.manner - right.manner) ** 2
      + FEATURE_WEIGHTS.voice * (left.voice - right.voice) ** 2
      + FEATURE_WEIGHTS.sibilant * (left.sibilant - right.sibilant) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * Substitution cost between two IPA segments, in `[0, 1]`. Identical base
 * symbols pay only for differing diacritics; otherwise the cost is a weighted
 * articulatory-feature distance plus any diacritic mismatch.
 */
export function segmentDistance(left: string, right: string): number {
  if (left === right) return 0;
  const leftId = segmentIds.get(left);
  const rightId = segmentIds.get(right);
  if (leftId !== undefined && rightId !== undefined) return internedPairCost(leftId, rightId);
  return computeSegmentDistance(left, right);
}

function computeSegmentDistance(left: string, right: string): number {
  if (left === right) return 0;

  const leftDiacritics = diacritics(left);
  const rightDiacritics = diacritics(right);
  let diacriticCost = 0;
  for (const mark of new Set([...leftDiacritics, ...rightDiacritics])) {
    if (!(leftDiacritics.includes(mark) && rightDiacritics.includes(mark))) {
      diacriticCost += DIACRITIC_COSTS[mark] ?? DEFAULT_DIACRITIC_COST;
    }
  }

  const leftBase = baseSymbol(left);
  const rightBase = baseSymbol(right);
  if (leftBase === rightBase) return Math.min(1, diacriticCost);

  const leftFeatures = SEGMENTS[leftBase];
  const rightFeatures = SEGMENTS[rightBase];
  if (!leftFeatures || !rightFeatures) return 1;

  return Math.min(1, featureDistance(leftFeatures, rightFeatures) + diacriticCost);
}

// Reused across calls: sequence lengths here are single digits, and this is the
// innermost loop of alternative selection, so it must not allocate per call.
let sequenceBuffer = new Float64Array(0);

/**
 * Edit distance between two segment sequences using the graded substitution
 * cost above, with unit-cost insertion and deletion. Segments are interned, so
 * the substitution cost is a table lookup rather than a reparsed string.
 */
export function segmentSequenceDistance(left: string[], right: string[]): number {
  const leftIds = internedIds(left);
  const rightIds = internedIds(right);
  const width = rightIds.length + 1;
  if (sequenceBuffer.length < width * 2) sequenceBuffer = new Float64Array(width * 2);
  const buffer = sequenceBuffer;

  for (let rightIndex = 0; rightIndex < width; rightIndex++) buffer[rightIndex] = rightIndex;
  let previous = 0;
  let current = width;
  for (let leftIndex = 1; leftIndex <= leftIds.length; leftIndex++) {
    buffer[current] = leftIndex;
    for (let rightIndex = 1; rightIndex < width; rightIndex++) {
      buffer[current + rightIndex] = Math.min(
        buffer[current + rightIndex - 1] + 1,
        buffer[previous + rightIndex] + 1,
        buffer[previous + rightIndex - 1] + internedPairCost(leftIds[leftIndex - 1], rightIds[rightIndex - 1]),
      );
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  return buffer[previous + rightIds.length];
}

// Transcript-pair distances are invariant for the lifetime of a deck, and the
// same pair is re-requested across the groups of a game, so cache by identity of
// the two arrays (both are owned by the deck and stable while it is loaded).
const sequenceCache = new WeakMap<string[], Map<string[], number>>();

/**
 * Distance between two sets of IPA transcriptions: the smallest segment-sequence
 * distance over every transcription pair. `null` when either side has no IPA.
 */
export function ipaSequenceDistance(left: string[] | undefined, right: string[] | undefined): number | null {
  if (!left?.length || !right?.length) return null;

  let byRight = sequenceCache.get(left);
  if (byRight === undefined) {
    byRight = new Map();
    sequenceCache.set(left, byRight);
  }
  const cached = byRight.get(right);
  if (cached !== undefined) return cached;

  let best = Infinity;
  for (const leftIpa of left) {
    const leftSegments = ipaSegments(leftIpa);
    for (const rightIpa of right) {
      best = Math.min(best, segmentSequenceDistance(leftSegments, ipaSegments(rightIpa)));
    }
  }
  byRight.set(right, best);
  return best;
}
