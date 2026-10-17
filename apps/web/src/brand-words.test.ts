import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The classic layout follows the shape of a competitor's admin portal,
 * never its brand: their product names must not appear in our labels,
 * code identifiers or styles (requirements Part 1.4, UNIT-10).
 */

// vitest runs from apps/web.
const SRC = join(process.cwd(), 'src');
const BRAND = /\b(adda|myadda|gatekeeper|aura)\b/i;
const THIS_FILE = 'brand-words.test.ts';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) && name !== THIS_FILE ? [path] : [];
  });
}

function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

describe('competitor brand words', () => {
  it('appear nowhere in the admin web source outside comments', () => {
    const hits = sourceFiles(SRC).flatMap((file) =>
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .filter((line) => BRAND.test(line))
        .map((line) => `${relative(SRC, file)}: ${line.trim()}`),
    );
    expect(hits).toEqual([]);
  });
});
