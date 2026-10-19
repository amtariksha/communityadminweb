import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_ROLE_ACCESS } from '@communityos/shared';
import { ADMIN_ROLE_ALLOW_LIST } from '@/hooks/use-tenant-admins';
import { ADMIN_ELIGIBLE_ROLES, getSidebarAllowlist } from './admin-roles';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from './role-catalogue';

/**
 * D12 — the guard supervisor role was merged into security_supervisor
 * (API migration 151). The admin web offers, labels and checks only the role
 * that absorbed it.
 */

const RETIRED = 'guard_' + 'supervisor';
// vitest runs from apps/web.
const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('the merged supervisor role (D12)', () => {
  it('is named nowhere in the admin web source', () => {
    const naming = sourceFiles(SRC)
      .filter((file) => readFileSync(file, 'utf8').includes(RETIRED))
      .map((file) => relative(SRC, file));

    expect(naming).toEqual([]);
  });

  it('cannot be granted, and does not open the admin web', () => {
    expect(ADMIN_ROLE_ALLOW_LIST as readonly string[]).not.toContain(RETIRED);
    expect(ASSIGNABLE_ROLES.map((role) => role.slug)).not.toContain(RETIRED);
    expect(ROLE_LABELS[RETIRED]).toBeUndefined();
    expect(APP_ROLE_ACCESS.admin as readonly string[]).not.toContain(RETIRED);
    expect(ADMIN_ELIGIBLE_ROLES.has(RETIRED)).toBe(false);
    expect(getSidebarAllowlist(RETIRED)?.size).toBe(0);
  });

  it('leaves the security supervisor its menu', () => {
    expect(getSidebarAllowlist('security_supervisor')?.has('Gate')).toBe(true);
    expect(getSidebarAllowlist('security_supervisor')?.has('Staff')).toBe(true);
  });
});
