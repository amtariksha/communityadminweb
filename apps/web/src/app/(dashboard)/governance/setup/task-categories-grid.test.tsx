import { describe, expect, it } from 'vitest';
import type { GridChange, GridRowState } from '@/components/editable-grid';
import { activeCount, toCategoryRows, validateCategories, type CategoryValues } from './task-categories-grid';

/** Setup Task Categories (PROJ-22): the rows sent and the checks before a save. */
const row = (key: string, name: string, id?: string, inactive = false): GridRowState<CategoryValues> =>
  ({ key, id, values: { name }, inactive }) as GridRowState<CategoryValues>;

describe('task categories grid', () => {
  it('sends the whole list in slot order, a retired row as is_active false', () => {
    const change = { rows: [row('a', ' Repairs ', 'c-1'), row('b', 'Events', 'c-2', true), row('c', 'Garden')] } as unknown as GridChange<CategoryValues>;
    expect(toCategoryRows(change)).toEqual([
      { id: 'c-1', name: 'Repairs', is_active: true },
      { id: 'c-2', name: 'Events', is_active: false },
      { name: 'Garden', is_active: true },
    ]);
    expect(activeCount(change)).toBe(2);
  });

  it('names a too-short or repeated category, and skips blank spare rows', () => {
    expect(validateCategories([row('a', 'Repairs', 'c-1'), row('b', 'repairs'), row('c', 'X'), row('d', '')])).toEqual({
      b: '"repairs" is already in the list.',
      c: 'A category is 2 to 60 characters.',
    });
  });
});
