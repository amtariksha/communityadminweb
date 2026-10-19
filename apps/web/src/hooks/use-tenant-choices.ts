'use client';

import { useQuery } from '@tanstack/react-query';
import type { Tenant } from '@communityos/shared';
import { api } from '@/lib/api';
import { tenantKeys } from './use-tenants';

// GET /tenants pages at most 100 rows (a larger limit is a 400), so a picker
// that must offer every society reads them page by page.
export const TENANT_PAGE = 100;
const MAX_PAGES = 50;

type PageReader = (page: number) => Promise<{ data: Tenant[]; total: number }>;

/** Every society, read 100 at a time until the reported total is reached. */
export async function readAllTenants(readPage: PageReader): Promise<Tenant[]> {
  const tenants: Tenant[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await readPage(page);
    tenants.push(...result.data);
    if (tenants.length >= result.total || result.data.length < TENANT_PAGE) break;
  }
  return tenants;
}

function readTenantPage(page: number): Promise<{ data: Tenant[]; total: number }> {
  return api.get<{ data: Tenant[]; total: number }>('/tenants', {
    params: { page: String(page), limit: String(TENANT_PAGE) },
  });
}

/** Every society, for the super-admin society pickers (not only the first 100). */
export function useTenantChoices() {
  return useQuery({
    queryKey: [...tenantKeys.all, 'choices'],
    queryFn: () => readAllTenants(readTenantPage),
    staleTime: 5 * 60_000,
  });
}
