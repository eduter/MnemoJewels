import { describe, expect, it } from 'vitest';
import type { DeckData } from '../src/types';
import { isObsoleteSense, isWhollyObsolete } from '../tools/decks/kaikki.ts';
import { obsoleteCardKeys, type LemmaRegisters } from '../tools/decks/obsolete.ts';

describe('isObsoleteSense', () => {
  it('flags a sense whose register label is obsolete/archaic/dated/rare', () => {
    // `al` (Portuguese) is only recorded as obsolete: the card must not ship.
    expect(isObsoleteSense({ raw_glosses: ['(obsolete) other, another'], glosses: ['other, another'] })).toBe(true);
    expect(isObsoleteSense({ raw_glosses: ['(archaic, poetic) wave'] })).toBe(true);
    expect(isObsoleteSense({ raw_glosses: ['(now dated) camera'] })).toBe(true);
    expect(isObsoleteSense({ raw_glosses: ['(historical) legua, Portuguese league'] })).toBe(true);
  });

  it('flags a label that joins two non-current registers with "or"', () => {
    // `ca` "because" is only `(obsolete or dialectal)`: both are non-current.
    expect(isObsoleteSense({ raw_glosses: ['(obsolete or dialectal) for, because'] })).toBe(true);
    expect(isObsoleteSense({ raw_glosses: ['(dated or dialectal) tail'] })).toBe(true);
  });

  it('flags a label that names only a dead period', () => {
    // `nele` -> "paddy" is `(Early Modern, India)`; the period is not current.
    expect(isObsoleteSense({ raw_glosses: ['(Early Modern, India) paddy (unhusked rice)'] })).toBe(true);
    expect(isObsoleteSense({ raw_glosses: ['(historical, Ancient Rome) gens'] })).toBe(true);
    expect(isObsoleteSense({ raw_glosses: ['(Ancient Rome) forum'] })).toBe(true);
    // `historical, measure` is historical *and* a unit, so the sense is stale.
    expect(isObsoleteSense({ raw_glosses: ['(historical, measure) dedo, a unit'] })).toBe(true);
  });

  it('keeps a bare dialectal sense, which is current usage', () => {
    expect(isObsoleteSense({ raw_glosses: ['(dialectal) tail'] })).toBe(false);
  });

  it('keeps a sense with no register label', () => {
    expect(isObsoleteSense({ glosses: ['judge'] })).toBe(false);
    expect(isObsoleteSense({ raw_glosses: ['map'] })).toBe(false);
  });

  it('keeps a sense whose label mixes in a region, field, or current register', () => {
    // A regional, field, or current-register part is not a bare register tag.
    expect(isObsoleteSense({ raw_glosses: ['(Portugal, dated in Brazil) camera'] })).toBe(false);
    expect(isObsoleteSense({ raw_glosses: ['(now chiefly Portugal, dated in Brazil) camera'] })).toBe(false);
    expect(isObsoleteSense({ raw_glosses: ['(dated or informal) Chinaman'] })).toBe(false);
    // `fórum` keeps its current sense: `Ancient Rome` is a field label here, not
    // the only sense, and the current sense has no register.
    expect(isObsoleteSense({ raw_glosses: ['(Brazil) a justice court'] })).toBe(false);
  });

  it('keeps current-but-informal registers', () => {
    expect(isObsoleteSense({ raw_glosses: ['(slang) testicle'] })).toBe(false);
    expect(isObsoleteSense({ raw_glosses: ['(informal in Portugal, literary, archaic or regional in Brazil) you'] })).toBe(false);
  });

  it('does not read head-template labels copied onto every sense', () => {
    // `mapa` "map" and `juiz` "judge" carry `obsolete`/`dated` in `tags` because
    // of an obsolete feminine / a dated gender variant; the word is current.
    const mapa = {
      tags: ['feminine', 'masculine', 'obsolete'],
      glosses: ['map'],
      links: [['map', 'map']],
    };
    expect(isObsoleteSense(mapa)).toBe(false);
    const juiz = {
      tags: ['by-personal-gender', 'dated', 'feminine', 'masculine'],
      glosses: ['judge'],
      links: [['judge', 'judge']],
    };
    expect(isObsoleteSense(juiz)).toBe(false);
  });
});

describe('isWhollyObsolete', () => {
  it('flags an entry whose every real sense is obsolete', () => {
    // `vero` "true" and `légua` are only recorded as archaic/historical.
    expect(isWhollyObsolete({
      senses: [
        { raw_glosses: ['(archaic) true, real, genuine'], glosses: ['true'] },
      ],
    })).toBe(true);
    expect(isWhollyObsolete({
      senses: [
        { raw_glosses: ['(historical) legua, a unit of distance'], glosses: ['legua'] },
        { raw_glosses: ['(historical) metric league'], glosses: ['league'] },
      ],
    })).toBe(true);
  });

  it('keeps an entry with any current sense', () => {
    expect(isWhollyObsolete({
      senses: [
        { raw_glosses: ['(archaic) ember-coloured'], glosses: ['ember'] },
        { glosses: ['Brazil'] },
      ],
    })).toBe(false);
  });

  it('does not flag a form-only entry as obsolete', () => {
    // `esposa` is a form-of entry with an obsolete noun sense; the form is not
    // an obsolete word, so it must not be flagged.
    expect(isWhollyObsolete({
      senses: [
        { tags: ['form-of'], glosses: ['female equivalent of esposo: wife'] },
      ],
    })).toBe(false);
  });
});

describe('obsoleteCardKeys', () => {
  const deck: DeckData = {
    uid: 'test',
    version: 1,
    displayName: 'Test',
    languageFront: 'pt',
    languageBack: 'en',
    cards: [
      ['al', 'other'],
      ['verdade', 'truth'],
      ['verdade', 'honesty'],
      ['esposa', 'bride'],
      ['mapa', 'map'],
    ],
    pronunciations: {},
  };

  const byLemma = new Map<string, LemmaRegisters>([
    ['al', { current: new Set(), obsolete: new Set(['other']) }],
    ['verdade', { current: new Set(['truth', 'fact']), obsolete: new Set(['honesty']) }],
    ['esposa', { current: new Set(['wife']), obsolete: new Set(['bride']) }],
    ['mapa', { current: new Set(['map']), obsolete: new Set() }],
  ]);

  it('drops a card whose gloss is produced only by obsolete senses', () => {
    const keys = obsoleteCardKeys(deck, byLemma, 'front');
    expect(keys).toContain('al\u0000other');
    expect(keys).toContain('esposa\u0000bride');
  });

  it('keeps a current gloss and a current word tagged obsolete in its head template', () => {
    const keys = obsoleteCardKeys(deck, byLemma, 'front');
    expect(keys).not.toContain('verdade\u0000truth');
    expect(keys).not.toContain('mapa\u0000map');
  });

  it('drops a reverse card whose back word has no current sense at all', () => {
    const reverse: DeckData = {
      ...deck,
      languageFront: 'en',
      languageBack: 'pt',
      cards: [
        ['other', 'al'],
        ['map', 'mapa'],
        ['truth', 'verdade'],
      ],
    };
    const keys = obsoleteCardKeys(reverse, byLemma, 'back');
    expect(keys).toContain('other\u0000al');
    expect(keys).not.toContain('map\u0000mapa');
    expect(keys).not.toContain('truth\u0000verdade');
  });
});
