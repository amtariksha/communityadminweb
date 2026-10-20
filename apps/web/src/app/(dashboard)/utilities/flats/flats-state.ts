import type { GridChange, SavedGridRow } from '@/components/editable-grid';
import type { TrackUnitList, TrackUnitSaveRow } from '@/hooks/use-track-units';
import { parseArea, trackUnitLabel } from '@/components/track-units/track-units-state';

/**
 * Track Utility Flats grid (UTIL-S4, UTIL-11) without React: one row per
 * unit; Tracked and the two areas are edited. Save sends only the rows that
 * changed; the unit type is left as it is.
 */
export interface FlatValues {
  unit: string;
  contact: string;
  tracked: 'yes' | 'no';
  /** An active unit meter: Not tracked is refused by the server. */
  metered: boolean;
  sqft1: string;
  sqft2: string;
}

const areaText = (value: string | null): string => (value === null ? '' : String(Number(value)));

export function toFlatRows(list: TrackUnitList): SavedGridRow<FlatValues>[] {
  return list.data
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.id,
      values: {
        unit: trackUnitLabel(row),
        contact: row.primary_contact_name ?? '',
        tracked: row.utility_tracked ? 'yes' : 'no',
        metered: row.has_active_meter === true,
        sqft1: areaText(row.area_sqft),
        sqft2: areaText(row.garden_area),
      },
    }));
}

/** Whether the server sends the Tracked column (an API older than UTIL-11 does not). */
export function knowsTracking(list: TrackUnitList | undefined): boolean {
  return list !== undefined && list.data.every((row) => row.utility_tracked !== undefined);
}

export function toFlatSaveRows(change: GridChange<FlatValues>): { rows: TrackUnitSaveRow[]; keys: string[] } {
  const changed = change.upserts.filter((row) => row.id !== undefined);
  return {
    rows: changed.map((row) => ({
      id: row.id as string,
      area_sqft: parseArea(row.values.sqft1),
      garden_area: parseArea(row.values.sqft2),
      utility_tracked: row.values.tracked === 'yes',
    })),
    keys: changed.map((row) => row.key),
  };
}
