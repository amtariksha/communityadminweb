import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A Date's ISO text is UTC: cut to ten characters on `new Date()` it is the
 * UTC day (yesterday in India from 00:00 to 05:30), and on a Date built at
 * local midnight it is the day before in India. Date inputs and their
 * defaults take days from `lib/date.ts` (`todayIST`, `utcDay`, `addDays`),
 * the only file allowed to cut ISO text into a day.
 */

// vitest runs from apps/web.
const SRC = join(process.cwd(), 'src');
const ALLOWED = new Set([join('lib', 'date.ts')]);
const UTC_DAY_PATTERNS: readonly RegExp[] = [
  /\.toISOString\(\)\s*\.\s*(slice|substring|substr)\(\s*0\s*,\s*(4|7|10)\s*\)/,
  /\.toISOString\(\)\s*\.\s*split\(\s*['"`]T['"`]\s*\)/,
  /\.toJSON\(\)\s*\.\s*(slice|substring|substr|split)\(/,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function offenders(files: readonly string[], read: (file: string) => string): string[] {
  return files.filter((file) => UTC_DAY_PATTERNS.some((pattern) => pattern.test(read(file))));
}

describe('no UTC day outside lib/date.ts', () => {
  it('the source takes days from lib/date.ts', () => {
    const files = sourceFiles(SRC).map((path) => relative(SRC, path)).filter((file) => !ALLOWED.has(file));
    expect(offenders(files, (file) => readFileSync(join(SRC, file), 'utf8'))).toEqual([]);
  });

  it('catches each way of writing it', () => {
    const samples: Record<string, string> = {
      slice: 'const d = new Date().toISOString().slice(0, 10);',
      split: "const d = new Date().toISOString().split('T')[0];",
      wrapped: 'const d = start\n  .toISOString()\n  .slice(0, 10);',
      fine: 'const d = todayIST(); const at = new Date().toISOString();',
    };
    expect(offenders(Object.keys(samples), (key) => samples[key])).toEqual(['slice', 'split', 'wrapped']);
  });
});
