import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The API refuses a `limit` over a route's cap with a 400 — 100 rows on a
 * list, 1,000 on the lookup lists that pickers load whole — and the picker
 * then shows empty. A literal limit over 100 must go to a lookup hook and stay
 * within that route's cap. The API keeps the matching table in
 * communityos `apps/api/src/modules/list-limit-callers.spec.ts`.
 */

// vitest runs from apps/web.
const SRC = join(process.cwd(), 'src');
const LIST_CAP = 100;
const LOOKUP_CAPS: Record<string, number> = {
  useLedgerAccounts: 1000, // GET /ledger/accounts
  useUnits: 1000, // GET /units
  useStaffAttendance: 1000, // GET /staff/attendance
  useSlots: 1000, // GET /parking/slots
  useSlotPage: 1000, // GET /parking/slots
  useAmenityBookings: 500, // GET /amenities/bookings
  useVendors: 1000, // GET /vendors (no cap; held to the lookup cap)
};
const HOOK_CALL = /\b(use[A-Z]\w*)\(\s*\{[^{}]*?\blimit:\s*(\d+)/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function overCap(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  return [...code.matchAll(HOOK_CALL)]
    .filter(([, hook, limit]) => Number(limit) > (LOOKUP_CAPS[hook] ?? LIST_CAP))
    .map(([, hook, limit]) => `${relative(SRC, file)}: ${hook}({ limit: ${limit} })`);
}

describe('list limits', () => {
  it('no hook call asks for more rows than its API route allows', () => {
    expect(sourceFiles(SRC).flatMap(overCap)).toEqual([]);
  });

  it('finds the lookup callers it is meant to check', () => {
    const accounts = readFileSync(join(SRC, 'app/(dashboard)/accounts/accounts-content.tsx'), 'utf8');
    expect([...accounts.matchAll(HOOK_CALL)].map(([, hook, limit]) => `${hook} ${limit}`)).toContain(
      'useLedgerAccounts 500',
    );
  });
});
