import type { AccountGroup } from '@communityos/shared';
import { rowErrorsFromApi, type GridChange, type GridChangeRow } from '@/components/editable-grid';
import type { GroupBulkRow } from '@/hooks/use-chart-of-accounts';
import { isBlankGroup, toGroupRow, type GridState, type GroupGridSpec, type GroupValues } from './group-grid';

/** Errors by grid, then by row key. */
export type GridErrors = Record<string, Record<string, string>>;

interface Sent {
  rows: GroupBulkRow[];
  deactivations: string[];
  // Which grid row each sent item came from, to put the API's errors back.
  rowRefs: Array<{ slug: string; key: string }>;
  deactivationRefs: Array<{ slug: string; key: string }>;
}

/** The four grids as one PUT /ledger/account-groups/bulk body. */
export function groupSaveBody(specs: readonly GroupGridSpec[], states: ReadonlyMap<string, GridState>, groups: readonly AccountGroup[]): Sent {
  const sent: Sent = { rows: [], deactivations: [], rowRefs: [], deactivationRefs: [] };
  for (const spec of specs) {
    const change = states.get(spec.slug)?.change;
    if (!change) continue;
    for (const row of change.upserts) {
      sent.rows.push(toGroupRow(row, spec, groups));
      sent.rowRefs.push({ slug: spec.slug, key: row.key });
    }
    for (const row of change.deactivations) {
      sent.deactivations.push(row.id as string);
      sent.deactivationRefs.push({ slug: spec.slug, key: row.key });
    }
  }
  return sent;
}

/** Required fields, and a GL No used twice anywhere in the four grids. */
export function validateGroups(specs: readonly GroupGridSpec[], states: ReadonlyMap<string, GridState>): GridErrors {
  const errors: GridErrors = {};
  const codes = new Map<string, { slug: string; key: string }>();
  const put = (slug: string, key: string, message: string) => ((errors[slug] ??= {})[key] = message);
  for (const spec of specs) {
    for (const row of states.get(spec.slug)?.rows ?? []) {
      if (row.inactive || (!row.id && isBlankGroup(row.values))) continue;
      const code = row.values.code.trim();
      if (!code) put(spec.slug, row.key, 'Enter the GL No.');
      else if (!row.values.name.trim()) put(spec.slug, row.key, 'Enter the group name.');
      const clash = code ? codes.get(code) : undefined;
      if (clash) {
        put(spec.slug, row.key, 'GL No already used');
        put(clash.slug, clash.key, 'GL No already used');
      } else if (code) codes.set(code, { slug: spec.slug, key: row.key });
    }
  }
  return errors;
}

const ref = (item: { slug: string; key: string }, position: number): GridChangeRow<GroupValues> => ({
  key: `${item.slug}|${item.key}`,
  values: { code: '', name: '', parent_id: '', type: '' },
  inactive: false,
  position,
  changed: true,
});

/** The API's refusal (rows.<n>, deactivations.<n>) back on the grid rows it names. */
export function groupErrorsFromApi(error: unknown, sent: Sent): GridErrors {
  const change: GridChange<GroupValues> = {
    rows: sent.rowRefs.map(ref),
    upserts: [],
    deactivations: sent.deactivationRefs.map(ref),
  };
  const found = { ...rowErrorsFromApi(error, change, 'rows'), ...rowErrorsFromApi(error, change, 'deactivations') };
  const errors: GridErrors = {};
  for (const [composite, message] of Object.entries(found)) {
    const [slug, key] = composite.split('|');
    (errors[slug] ??= {})[key] = message;
  }
  return errors;
}
