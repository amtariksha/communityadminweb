import { ApiError } from '@/lib/api-error';

/**
 * State and save payload of the editable grid (requirements SB-08), kept
 * free of React so the rules are tested on their own.
 */

/** A row the server already has. */
export interface SavedGridRow<Values> {
  id: string;
  values: Values;
  inactive?: boolean;
}

export interface GridRowState<Values> {
  // Stable while the grid is open; spare rows have no id.
  key: string;
  id?: string;
  values: Values;
  inactive: boolean;
  // As loaded, to tell what changed. Absent on a spare row.
  saved?: { values: Values; inactive: boolean; index: number };
}

export interface GridChangeRow<Values> {
  key: string;
  id?: string;
  values: Values;
  inactive: boolean;
  // 1-based place in the grid, e.g. for a display order.
  position: number;
  changed: boolean;
}

/**
 * What Save Changes sends. `rows` is the whole list in grid order (for a
 * `PUT …/bulk { rows }`); `upserts` and `deactivations` are the same rows
 * split for a `{ upserts, deactivations }` API. Blank spare rows, and new
 * rows marked inactive, are never sent.
 */
export interface GridChange<Values> {
  rows: GridChangeRow<Values>[];
  upserts: GridChangeRow<Values>[];
  deactivations: GridChangeRow<Values>[];
}

export function sameValues<Values>(a: Values, b: Values): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => Object.is(left[key], right[key]));
}

export function initialRows<Values>(
  saved: readonly SavedGridRow<Values>[],
  newKey: () => string,
): GridRowState<Values>[] {
  return saved.map((row, index) => ({
    key: newKey(),
    id: row.id,
    values: row.values,
    inactive: row.inactive === true,
    saved: { values: row.values, inactive: row.inactive === true, index },
  }));
}

export function spareRows<Values>(count: number, blank: () => Values, newKey: () => string): GridRowState<Values>[] {
  return Array.from({ length: count }, () => ({ key: newKey(), values: blank(), inactive: false }));
}

/** A spare row nobody has typed into. */
export function isBlankRow<Values>(
  row: GridRowState<Values>,
  blank: () => Values,
  isBlank?: (values: Values) => boolean,
): boolean {
  if (row.id) return false;
  return isBlank ? isBlank(row.values) : sameValues(row.values, blank());
}

function rowChanged<Values>(row: GridRowState<Values>, index: number): boolean {
  if (!row.saved) return true;
  return (
    !sameValues(row.values, row.saved.values) || row.inactive !== row.saved.inactive || index !== row.saved.index
  );
}

export function gridChange<Values>(
  rows: readonly GridRowState<Values>[],
  blank: () => Values,
  isBlank?: (values: Values) => boolean,
): GridChange<Values> {
  const sent = rows.flatMap((row, index) => {
    if (isBlankRow(row, blank, isBlank) || (row.inactive && !row.id)) return [];
    const { key, id, values, inactive } = row;
    return [{ key, id, values, inactive, position: index + 1, changed: rowChanged(row, index) }];
  });
  return {
    rows: sent,
    upserts: sent.filter((row) => row.changed && !row.inactive),
    deactivations: sent.filter((row) => row.changed && row.inactive && row.id !== undefined),
  };
}

export function hasChanges<Values>(change: GridChange<Values>): boolean {
  return change.rows.some((row) => row.changed);
}

type ListName = 'rows' | 'upserts' | 'deactivations';

function firstMessage(messages: unknown): string | undefined {
  if (Array.isArray(messages)) return typeof messages[0] === 'string' ? messages[0] : undefined;
  return typeof messages === 'string' ? messages : undefined;
}

/**
 * Per-row messages from a refused save, by grid row key. Reads the SB-08
 * shape (`errors["rows.3.name"]`, as a Zod failure names fields) and the
 * older list shape (`errors: [{ row: 3, message }]`).
 */
export function rowErrorsFromApi<Values>(
  error: unknown,
  change: GridChange<Values>,
  list: ListName = 'rows',
): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const sent = change[list];
  const found: Record<string, string> = {};
  const raw = error.envelope.errors as unknown;
  const put = (index: number, message: string | undefined): void => {
    const row = sent[index];
    if (row && message && !found[row.key]) found[row.key] = message;
  };
  if (Array.isArray(raw)) {
    for (const item of raw as Array<{ row?: unknown; message?: unknown }>) {
      if (typeof item?.row === 'number') put(item.row, firstMessage(item.message) ?? error.userMessage);
    }
    return found;
  }
  for (const [path, messages] of Object.entries((raw ?? {}) as Record<string, unknown>)) {
    const match = new RegExp(`^${list}\\.(\\d+)(?:\\.|$)`).exec(path);
    if (match) put(Number(match[1]), firstMessage(messages));
  }
  return found;
}
