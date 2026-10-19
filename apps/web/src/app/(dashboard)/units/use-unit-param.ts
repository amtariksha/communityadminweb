'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useUnit } from '@/hooks';

/** What today's unit dialog needs to open on a unit. */
export interface UnitToOpen {
  id: string;
  unit_number: string;
  block?: string | null;
  floor: number;
  area_sqft: number;
  unit_type: string;
  is_active: boolean;
  member_category_id?: string | null;
  billing_category_id?: string | null;
  garden_area?: number | string | null;
}

/**
 * `?unit=<id>` opens that unit's dialog on its Details tab. The classic
 * unit panel links here for "View/Edit Unit details" until UNIT-16 gives
 * the form a page of its own. The parameter is dropped once handled, so
 * Back and a reload do not open the dialog again.
 */
export function useOpenUnitParam(open: (unit: UnitToOpen) => void): void {
  const query = useSearchParams()?.toString() ?? '';
  const unitId = new URLSearchParams(query).get('unit') ?? '';
  const pathname = usePathname();
  const router = useRouter();
  const unitQuery = useUnit(unitId);
  const latestOpen = useRef(open);
  latestOpen.current = open;
  const handled = useRef('');

  useEffect(() => {
    const unit = unitQuery.data as UnitToOpen | undefined;
    if (!unitId || !unit || handled.current === unitId) return;
    handled.current = unitId;
    latestOpen.current(unit);
    const params = new URLSearchParams(query);
    params.delete('unit');
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
  }, [unitId, unitQuery.data, query, pathname, router]);
}
