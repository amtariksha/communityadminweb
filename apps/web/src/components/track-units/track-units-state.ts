import type { GridChange, SavedGridRow } from '@/components/editable-grid';
import type { TrackUnitList, TrackUnitSaveResult, TrackUnitSaveRow } from '@/hooks/use-track-units';

/**
 * Track Units grid (INC-37) without React: one row per unit; the type,
 * Sq.ft 1 and Sq.ft 2 are edited, the rest is shown. Save sends only the
 * rows that changed and puts the server's per-row errors back on them.
 */
export interface TrackUnitValues {
  unit: string;
  contact: string;
  deletable: boolean;
  category: string;
  sqft1: string;
  sqft2: string;
}

const areaText = (value: string | null): string => (value === null ? '' : String(Number(value)));

export function trackUnitLabel(row: { unit_number: string; block: string | null }): string {
  return row.block ? `${row.block}-${row.unit_number}` : row.unit_number;
}

export function toGridRows(list: TrackUnitList): SavedGridRow<TrackUnitValues>[] {
  return list.data.map((row) => ({
    id: row.id,
    values: {
      unit: trackUnitLabel(row),
      contact: row.primary_contact_name ?? '',
      deletable: row.deletable === true,
      category: row.billing_category_id ?? '',
      sqft1: areaText(row.area_sqft),
      sqft2: areaText(row.garden_area),
    },
  }));
}

/** A typed area: a number, or null when blank or not a number (the server names the error). */
export function parseArea(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** The rows to send and, in the same order, their grid keys. */
export function toSaveRows(change: GridChange<TrackUnitValues>): { rows: TrackUnitSaveRow[]; keys: string[] } {
  const changed = change.upserts.filter((row) => row.id !== undefined);
  return {
    rows: changed.map((row) => ({
      id: row.id as string,
      billing_category_id: row.values.category || null,
      area_sqft: parseArea(row.values.sqft1),
      garden_area: parseArea(row.values.sqft2),
    })),
    keys: changed.map((row) => row.key),
  };
}

/** `rows.<n>.<field>` errors of a save, as one message per grid row key. */
export function rowErrorsFromSave(result: TrackUnitSaveResult, keys: readonly string[]): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [path, messages] of Object.entries(result.errors)) {
    const match = /^rows\.(\d+)\./.exec(path);
    const key = match ? keys[Number(match[1])] : undefined;
    if (key && !found[key] && messages[0]) found[key] = messages[0];
  }
  return found;
}

/** "1,23,456.5" for the totals line. */
export function areaTotal(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
