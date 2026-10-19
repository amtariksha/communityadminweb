import { describe, expect, it, vi } from 'vitest';
import type { Tenant } from '@communityos/shared';
import { TENANT_PAGE, readAllTenants } from './use-tenant-choices';

const society = (n: number): Tenant => ({ id: `t-${n}`, name: `Society ${n}` }) as Tenant;

function pages(total: number) {
  const all = Array.from({ length: total }, (_, index) => society(index + 1));
  return vi.fn(async (page: number) => ({
    data: all.slice((page - 1) * TENANT_PAGE, page * TENANT_PAGE),
    total,
  }));
}

describe('readAllTenants', () => {
  it('reads every society past the first 100, a page at a time', async () => {
    const readPage = pages(230);
    const tenants = await readAllTenants(readPage);
    expect(tenants).toHaveLength(230);
    expect(tenants[229].name).toBe('Society 230');
    expect(readPage.mock.calls.map(([page]) => page)).toEqual([1, 2, 3]);
  });

  it('stops after one page when there are fewer than 100', async () => {
    const readPage = pages(12);
    expect(await readAllTenants(readPage)).toHaveLength(12);
    expect(readPage).toHaveBeenCalledTimes(1);
  });
});
