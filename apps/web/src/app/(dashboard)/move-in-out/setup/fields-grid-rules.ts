import type { GridChange, GridRowState } from '@/components/editable-grid';
import type { FieldAppliesTo, FieldDef, FieldType, SaveFieldDefsInput } from '@/hooks/use-resident-fields';

/** One row of MOVE-S4 / S5 as edited. Choices are typed as a comma list. */
export interface FieldRowValues {
  position: string;
  label: string;
  is_enabled: boolean;
  type: FieldType;
  choices: string;
  applies_to: FieldAppliesTo;
  predefined: boolean;
}

export const CHOICE_TYPES: ReadonlySet<FieldType> = new Set(['single', 'multiple']);

export function rowValues(def: FieldDef): FieldRowValues {
  return {
    position: String(def.position),
    label: def.label,
    is_enabled: def.is_enabled,
    type: def.type,
    choices: (def.choices ?? []).join(', '),
    applies_to: def.applies_to,
    predefined: def.is_predefined,
  };
}

export function splitChoices(text: string): string[] {
  return text
    .split(',')
    .map((choice) => choice.trim())
    .filter(Boolean);
}

function choicesProblem(text: string): boolean {
  const list = splitChoices(text);
  const distinct = new Set(list.map((choice) => choice.toLowerCase())).size === list.length;
  return list.length < 2 || list.length > 20 || !distinct || list.some((choice) => choice.length > 40);
}

function rowProblem(values: FieldRowValues, position: number, seen: Set<string>): string | null {
  const order = Number(values.position);
  if (!Number.isInteger(order) || order < 0 || order > 99 || values.position.trim() === '') return 'Display Order is 0 to 99.';
  if (values.predefined) return null;
  const label = values.label.trim();
  if (values.is_enabled && !label) return 'Give the field a name before switching it on.';
  if (label.length > 60) return 'A field name is at most 60 characters.';
  if (label && seen.has(label.toLowerCase())) return `"${label}" is already a field name.`;
  if (CHOICE_TYPES.has(values.type) && choicesProblem(values.choices)) {
    return `Row ${position}: give 2 to 20 different choices of 1 to 40 characters, separated by commas.`;
  }
  return null;
}

/** Messages by row key; nothing is sent while there are any. */
export function validateFieldRows(rows: readonly GridRowState<FieldRowValues>[]): Record<string, string> {
  const seen = new Set(rows.filter((row) => row.values.predefined).map((row) => row.values.label.toLowerCase()));
  const errors: Record<string, string> = {};
  rows.forEach((row, index) => {
    const problem = rowProblem(row.values, index + 1, seen);
    if (problem) errors[row.key] = problem;
    if (!row.values.predefined && row.values.label.trim()) seen.add(row.values.label.trim().toLowerCase());
  });
  return errors;
}

/** The whole grid for PUT /tenant-lifecycle/fields/:phase; predefined rows send their stored name, type and choices. */
export function toFieldRows(change: GridChange<FieldRowValues>, saved: readonly FieldDef[]): SaveFieldDefsInput['rows'] {
  const byId = new Map(saved.map((def) => [def.id, def]));
  return change.rows.map((row) => {
    const stored = byId.get(row.id ?? '');
    const predefined = stored?.is_predefined === true;
    const type = predefined ? stored.type : row.values.type;
    return {
      id: row.id ?? '',
      position: Number(row.values.position),
      label: predefined ? stored.label : row.values.label.trim(),
      is_enabled: row.values.is_enabled,
      type,
      choices: predefined ? stored.choices : CHOICE_TYPES.has(type) ? splitChoices(row.values.choices) : null,
      applies_to: row.values.applies_to,
    };
  });
}
