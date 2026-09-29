import { describe, expect, it } from 'vitest';
import {
  ipaSegments,
  ipaSequenceDistance,
  segmentDistance,
  segmentSequenceDistance,
} from '../src/phonetics';

describe('IPA segment tokenization', () => {
  it('keeps diacritics attached to their base symbol', () => {
    expect(ipaSegments('[prɐˈblʲemə]')).toEqual(['p', 'r', 'ɐ', 'b', 'lʲ', 'e', 'm', 'ə']);
    expect(ipaSegments('/ˈænd/')).toEqual(['æ', 'n', 'd']);
    expect(ipaSegments('[dʲɪpʊˈtat]')).toEqual(['dʲ', 'ɪ', 'p', 'ʊ', 't', 'a', 't']);
  });

  it('treats a length mark as part of the preceding segment', () => {
    expect(ipaSegments('/kɑːˈtuːn/')).toEqual(['k', 'ɑː', 't', 'uː', 'n']);
  });
});

describe('articulatory segment distance', () => {
  it('is zero for identical segments', () => {
    expect(segmentDistance('t', 't')).toBe(0);
    expect(segmentDistance('lʲ', 'lʲ')).toBe(0);
  });

  it('keeps near-allophones much cheaper than unrelated sounds', () => {
    // Same place/manner, differing only in voicing: a phonemic contrast, so not
    // free, but far below an unrelated sound.
    expect(segmentDistance('t', 'd')).toBeLessThan(0.7);
    // Alveolar approximant vs alveolar trill: both rhotics, same place.
    expect(segmentDistance('r', 'ɹ')).toBeLessThan(0.35);
    // Near vowels.
    expect(segmentDistance('ɪ', 'i')).toBeLessThan(0.3);
    expect(segmentDistance('ʊ', 'u')).toBeLessThan(0.3);
    // Retroflex vs postalveolar sibilant.
    expect(segmentDistance('ʂ', 'ʃ')).toBeLessThan(0.3);
    // A vowel and a consonant are still a large cost.
    expect(segmentDistance('a', 't')).toBeGreaterThan(0.8);
  });

  it('charges only a small amount for a palatalization difference', () => {
    expect(segmentDistance('l', 'lʲ')).toBeLessThan(0.25);
    expect(segmentDistance('t', 'tʲ')).toBeLessThan(0.25);
  });
});

describe('IPA sequence distance', () => {
  it('collapses spelling-level variation that a character comparison inflates', () => {
    // /r/ vs /ɹ/, /ɒ/ vs /ɐ/, inserted palatalization and a trailing vowel.
    const distance = ipaSequenceDistance(['[prɐˈblʲemə]'], ['/ˈprɒbləm/'])!;
    expect(distance).toBeLessThan(2.2);

    const magazine = ipaSequenceDistance(['[məɡɐˈzʲin]'], ['/ˌmæɡəˈziːn/'])!;
    expect(magazine).toBeLessThan(1);
  });

  it('returns null when either side has no transcription', () => {
    expect(ipaSequenceDistance(undefined, ['/test/'])).toBeNull();
    expect(ipaSequenceDistance(['/test/'], [])).toBeNull();
  });

  it('takes the closest pair across transcription variants', () => {
    const withVariants = ipaSequenceDistance(
      ['[spɔrt]'],
      ['/spəʊt/', '/spɔːt/', '[spoɹʔ]'],
    )!;
    const bestSingle = ipaSequenceDistance(['[spɔrt]'], ['/spɔːt/'])!;
    expect(withVariants).toBeLessThanOrEqual(bestSingle);
  });
});

// The hot path is memoized (segmentation, segment-pair cost, transcript-pair
// distance, reused DP buffer). These pin the invariants that make that safe:
// cached calls must return the same values as cold ones, and interning many
// distinct segments must not corrupt earlier results.
describe('memoization invariants', () => {
  it('returns identical distances when a pair is requested again', () => {
    const first = ipaSequenceDistance(['[məɡɐˈzʲin]'], ['/ˌmæɡəˈziːn/'])!;
    const second = ipaSequenceDistance(['[məɡɐˈzʲin]'], ['/ˌmæɡəˈziːn/'])!;
    expect(second).toBe(first);
  });

  it('is stable across repeated sequence comparisons of the same segments', () => {
    const left = ipaSegments('[prɐˈblʲemə]');
    const right = ipaSegments('/ˈprɒbləm/');
    const first = segmentSequenceDistance(left, right);
    for (let i = 0; i < 5; i++) {
      expect(segmentSequenceDistance(left, right)).toBe(first);
    }
  });

  it('matches a fresh computation after interning many unrelated segments', () => {
    const left = ipaSegments('[ɑ]');
    const right = ipaSegments('[b]');
    for (const sound of ['ɡ', 'ɟ', 'ɢ', 'χ', 'ʁ', 'ʕ', 'ħ', 'ɦ', 'ɱ', 'ɳ', 'ɲ', 'ŋ']) {
      segmentDistance(sound, 'a');
      segmentDistance('a', sound);
    }
    // Recompute after the matrix has grown and swapped buffers underneath.
    expect(segmentSequenceDistance(left, right)).toBe(
      segmentSequenceDistance(ipaSegments('[ɑ]'), ipaSegments('[b]')),
    );
    expect(segmentDistance('ɑ', 'b')).toBe(segmentDistance('ɑ', 'b'));
  });
});
