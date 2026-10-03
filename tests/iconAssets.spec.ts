import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ICON = resolve('assets/icons/jewel-mj.svg');
const PUBLIC_ICON = resolve('public/icon.svg');

function ids(svg: string): string[] {
  return [...svg.matchAll(/\sid="([^"]*)"/g)].map(match => match[1]);
}

function references(svg: string): string[] {
  return [
    ...[...svg.matchAll(/url\(#([^)]*)\)/g)].map(match => match[1]),
    ...[...svg.matchAll(/href="#([^"]*)"/g)].map(match => match[1]),
  ];
}

describe('app icon SVG', () => {
  const svg = readFileSync(ICON, 'utf8');

  it('declares each id only once', () => {
    const declared = ids(svg);
    const duplicates = declared.filter((id, index) => declared.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });

  it('has every reference resolve to a declared id', () => {
    const declared = new Set(ids(svg));
    const dangling = references(svg).filter(ref => !declared.has(ref));
    expect(dangling).toEqual([]);
  });

  it('is shipped verbatim as public/icon.svg', () => {
    expect(readFileSync(PUBLIC_ICON, 'utf8')).toBe(svg);
  });
});
