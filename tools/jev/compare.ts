// Compares a Jev triage report against an authoritative hand-curated gloss map.
//
// When a human has already decided which senses a learner should see, that map
// is ground truth, and the triage can be scored against it. This is how a deck
// with a curated subset validates the classifier before it is trusted on the
// parts nobody has curated yet.
//
//   node --experimental-strip-types tools/jev/compare.ts \
//     --report   analysis/jev/top-ru-en/short4-triage-report.json \
//     --curation .cache/pr28/shortWordCuration.ts \
//     --out      analysis/jev/top-ru-en/short4-vs-curation.json
//
// `--curation` is any module exporting `SHORT_WORD_GLOSSES` (a Map from lemma
// to the glosses a learner should associate with it) and, optionally,
// `SHORT_WORD_MAX_LENGTH`. Deck-agnostic; only reads the report and the map.

import { parseArgs } from 'node:util';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { TriageReport } from './types.ts';

export interface Curation {
  maxLength: number;
  glosses: Map<string, readonly string[]>;
}

export interface CompareRow {
  front: string;
  back: string;
  curated: boolean;
  jev: 'keep' | 'drop';
  /** Human kept it but Jev drops it, so Jev would remove a wanted sense. */
  jevDropsCurated: boolean;
  /** Human excluded it but Jev keeps it, so a false association survives. */
  jevKeepsUncurated: boolean;
}

export interface CompareResult {
  report: TriageReport;
  curation: Curation;
  evaluated: number;
  exactMatches: number;
  jevDropsCurated: CompareRow[];
  jevKeepsUncurated: CompareRow[];
  rows: CompareRow[];
  metrics: { precision: number; recall: number; falseDrop: number; falseKeep: number };
}

/** Whether the human curation for a lemma includes this gloss. */
export function curates(glosses: readonly string[], back: string): boolean {
  return glosses.includes(back);
}

export function compare(report: TriageReport, curation: Curation): CompareResult {
  const rows: CompareRow[] = [];
  let exactMatches = 0;
  let trueKeep = 0;
  let trueDrop = 0;
  const jevDropsCurated: CompareRow[] = [];
  const jevKeepsUncurated: CompareRow[] = [];

  for (const lemma of report.byLemma) {
    if (lemma.front.length > curation.maxLength) continue;
    const glosses = curation.glosses.get(lemma.front);
    if (!glosses) continue;
    for (const candidate of lemma.candidates ?? []) {
      const curated = curates(glosses, candidate.back);
      const jevDropsCuratedFlag = curated && !candidate.keep;
      const jevKeepsUncuratedFlag = !curated && candidate.keep;
      const row: CompareRow = {
        front: candidate.front,
        back: candidate.back,
        curated,
        jev: candidate.keep ? 'keep' : 'drop',
        jevDropsCurated: jevDropsCuratedFlag,
        jevKeepsUncurated: jevKeepsUncuratedFlag,
      };
      rows.push(row);
      if (curated === candidate.keep) {
        exactMatches += 1;
        if (curated) trueKeep += 1;
        else trueDrop += 1;
      } else if (jevDropsCuratedFlag) {
        jevDropsCurated.push(row);
      } else {
        jevKeepsUncurated.push(row);
      }
    }
  }

  const curatedTotal = trueKeep + jevDropsCurated.length;
  const jevKeepTotal = trueKeep + jevKeepsUncurated.length;
  return {
    report,
    curation,
    evaluated: rows.length,
    exactMatches,
    jevDropsCurated,
    jevKeepsUncurated,
    rows,
    metrics: {
      precision: jevKeepTotal === 0 ? 1 : trueKeep / jevKeepTotal,
      recall: curatedTotal === 0 ? 1 : trueKeep / curatedTotal,
      falseDrop: jevDropsCurated.length,
      falseKeep: jevKeepsUncurated.length,
    },
  };
}

export async function loadCuration(path: string): Promise<Curation> {
  const url = pathToFileURL(isAbsolute(path) ? path : resolve(path)).href;
  const mod = await import(url) as {
    SHORT_WORD_GLOSSES?: Map<string, readonly string[]>;
    SHORT_WORD_MAX_LENGTH?: number;
  };
  if (!mod.SHORT_WORD_GLOSSES) {
    throw new Error(`${path} does not export SHORT_WORD_GLOSSES`);
  }
  return { maxLength: mod.SHORT_WORD_MAX_LENGTH ?? 4, glosses: mod.SHORT_WORD_GLOSSES };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      report: { type: 'string', required: true },
      curation: { type: 'string', required: true },
      out: { type: 'string', required: true },
    },
    allowPositionals: false,
  });

  const report = JSON.parse(await readFile(resolve(values.report!), 'utf8')) as TriageReport;
  const curation = await loadCuration(values.curation!);
  const result = compare(report, curation);
  const out = resolve(values.out!);
  await mkdir(resolve(out, '..'), { recursive: true });
  await writeFile(out, `${JSON.stringify(result, null, 2)}\n`);
  const m = result.metrics;
  console.log(
    `Compared ${result.evaluated} cards across ${curation.glosses.size} curated lemmas: `
    + `${result.exactMatches} agree, Jev drops ${m.falseDrop} curated senses, `
    + `Jev keeps ${m.falseKeep} uncurated senses. Precision ${m.precision.toFixed(2)}, recall ${m.recall.toFixed(2)}. `
    + `Wrote ${out}`,
  );
}

if (process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`) {
  await main();
}
