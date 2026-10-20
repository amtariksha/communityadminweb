import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Part 2.8: test fixtures use made-up names. Tests named real companies as
 * vendors and manufacturers (a lift maker, a pump maker); this keeps them
 * out. Banks are left alone: a bank ledger names its bank.
 */

// vitest runs from apps/web.
const SRC = join(process.cwd(), 'src');
const THIS_FILE = 'fixture-company-names.test.ts';
const COMPANY_NAMES = [
  'Asian Paints', 'Berger', 'Nerolac', 'Otis', 'Kone', 'Schindler', 'Kirloskar', 'Cummins', 'Hikvision',
  'Godrej', 'Havells', 'Daikin', 'Voltas', 'Bosch', 'Honeywell', 'Siemens', 'Philips',
  'Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Dunzo', 'BigBasket', 'Blinkit', 'Zepto',
  'BlueDart', 'Blue Dart', 'DTDC', 'Delhivery', 'Urban Company',
];
const PATTERN = new RegExp(`\\b(${COMPANY_NAMES.join('|')})\\b`);

function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return testFiles(path);
    return /\.test\.tsx?$/.test(name) && name !== THIS_FILE ? [path] : [];
  });
}

describe('test fixtures', () => {
  it('name no real company', () => {
    const files = testFiles(SRC);
    expect(files.length).toBeGreaterThan(50);
    const hits = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => PATTERN.test(line))
        .map((line) => `${relative(SRC, file)}: ${line.trim()}`),
    );
    expect(hits).toEqual([]);
  });
});
