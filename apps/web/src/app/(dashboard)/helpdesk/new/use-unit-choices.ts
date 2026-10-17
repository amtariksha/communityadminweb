'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UnitChoice {
  id: string;
  unit_number: string;
  block?: string | null;
}

// GET /units pages at most 100 rows; a society is read page by page.
const PAGE = 100;
const MAX_PAGES = 30;

async function fetchAllUnits(): Promise<UnitChoice[]> {
  const units: UnitChoice[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await api.get<{ data: UnitChoice[]; total: number }>('/units', {
      params: { page: String(page), limit: String(PAGE) },
    });
    units.push(...result.data);
    if (units.length >= result.total || result.data.length < PAGE) break;
  }
  return units;
}

/** Every unit of the society, for the unit picker of Create Request. */
export function useUnitChoices() {
  return useQuery({
    queryKey: ['units', 'choices'],
    queryFn: fetchAllUnits,
    staleTime: 5 * 60_000,
  });
}
