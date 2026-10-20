import { describe, expect, it } from 'vitest';
import type { TrackUnitList } from '@/hooks/use-track-units';
import { knowsTracking, toFlatRows, toFlatSaveRows } from './flats-state';

/** UTIL-11 — Track Utility Flats rows. */
const list = (extra: Partial<TrackUnitList['data'][number]> = {}): TrackUnitList => ({
  data: [
    { id: 'u1', unit_number: '101', block: 'A', is_active: true, billing_category_id: 'type-1', area_sqft: '1200.00', garden_area: null, primary_contact_name: 'Owner 101', utility_tracked: true, has_active_meter: true, ...extra },
    { id: 'u2', unit_number: '102', block: 'A', is_active: false, billing_category_id: null, area_sqft: '900.00', garden_area: null, primary_contact_name: null, utility_tracked: false, has_active_meter: false },
  ],
  totals: { units: 1, total_sqft1: 1200, total_sqft2: 0 },
});

describe('Track Utility Flats state', () => {
  it('lists the active units with Tracked and the areas', () => {
    expect(toFlatRows(list())).toEqual([
      { id: 'u1', values: { unit: 'A-101', contact: 'Owner 101', tracked: 'yes', metered: true, sqft1: '1200', sqft2: '' } },
    ]);
  });

  it('sends Tracked and the areas of the changed rows, never the unit type', () => {
    const change = {
      upserts: [{ key: 'k1', id: 'u1', values: { unit: 'A-101', contact: '', tracked: 'no' as const, metered: true, sqft1: '1250', sqft2: '' } }],
      deactivations: [],
    };
    const { rows, keys } = toFlatSaveRows(change as never);
    expect(rows).toEqual([{ id: 'u1', area_sqft: 1250, garden_area: null, utility_tracked: false }]);
    expect(keys).toEqual(['k1']);
  });

  it('knows an API older than UTIL-11 sends no Tracked column', () => {
    expect(knowsTracking(list())).toBe(true);
    expect(knowsTracking(list({ utility_tracked: undefined }))).toBe(false);
    expect(knowsTracking(undefined)).toBe(false);
  });
});
