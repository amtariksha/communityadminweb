import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { gridChange, hasChanges, initialRows, rowErrorsFromApi, spareRows, type GridRowState } from './grid-state';

interface Values {
  name: string;
  active: boolean;
}

const blank = (): Values => ({ name: '', active: false });

function grid(): GridRowState<Values>[] {
  let next = 0;
  const key = (): string => `k${next++}`;
  return [
    ...initialRows<Values>(
      [
        { id: 'a', values: { name: 'Plumbing', active: true } },
        { id: 'b', values: { name: 'Lifts', active: true } },
      ],
      key,
    ),
    ...spareRows(2, blank, key),
  ];
}

describe('gridChange (SB-08)', () => {
  it('sends nothing changed for an untouched grid, and no spare rows', () => {
    const change = gridChange(grid(), blank);
    expect(change.rows.map((row) => [row.id, row.position, row.changed])).toEqual([
      ['a', 1, false],
      ['b', 2, false],
    ]);
    expect(change.upserts).toEqual([]);
    expect(change.deactivations).toEqual([]);
    expect(hasChanges(change)).toBe(false);
  });

  it('splits edits and new rows (upserts) from rows marked inactive (deactivations)', () => {
    const rows = grid();
    rows[0] = { ...rows[0], values: { name: 'Plumbing & Water', active: true } };
    rows[1] = { ...rows[1], inactive: true };
    rows[2] = { ...rows[2], values: { name: 'Gas', active: true } };

    const change = gridChange(rows, blank);
    expect(change.upserts.map((row) => [row.id, row.values.name, row.position])).toEqual([
      ['a', 'Plumbing & Water', 1],
      [undefined, 'Gas', 3],
    ]);
    expect(change.deactivations.map((row) => row.id)).toEqual(['b']);
    expect(hasChanges(change)).toBe(true);
  });

  it('drops a new row marked inactive, and counts a move as a change', () => {
    const rows = grid();
    rows[2] = { ...rows[2], values: { name: 'Typo', active: false }, inactive: true };
    const moved = [rows[1], rows[0], rows[2], rows[3]];

    const change = gridChange(moved, blank);
    expect(change.rows.map((row) => [row.id, row.position, row.changed])).toEqual([
      ['b', 1, true],
      ['a', 2, true],
    ]);
  });

  it('uses the page’s own idea of a blank row when given', () => {
    const rows = grid();
    rows[2] = { ...rows[2], values: { name: '   ', active: false } };
    const change = gridChange(rows, blank, (values) => values.name.trim() === '');
    expect(change.rows).toHaveLength(2);
  });
});

describe('rowErrorsFromApi', () => {
  const rows = grid();
  rows[2] = { ...rows[2], values: { name: 'Gas', active: true } };
  const change = gridChange(rows, blank);

  it('puts each "rows.<n>.<field>" message on its row', () => {
    const error = new ApiError(400, {
      message: 'One row could not be saved. Nothing was changed.',
      code: 'bulk_rows_invalid',
      errors: { 'rows.2.name': ['Another block is already called GAS.'], 'rows.0.name': ['Too long.'] },
    } as never);

    expect(rowErrorsFromApi(error, change)).toEqual({
      [rows[2].key]: 'Another block is already called GAS.',
      [rows[0].key]: 'Too long.',
    });
  });

  it('reads the older list shape and the upserts list', () => {
    const listShape = new ApiError(400, { message: 'Owner must be an admin', errors: [{ row: 1 }] } as never);
    expect(rowErrorsFromApi(listShape, change)).toEqual({ [rows[1].key]: 'Owner must be an admin' });

    const upserts = new ApiError(400, { message: 'x', errors: { 'upserts.0.name': ['Enter a name.'] } } as never);
    expect(rowErrorsFromApi(upserts, change, 'upserts')).toEqual({ [rows[2].key]: 'Enter a name.' });
  });

  it('finds nothing in an error that is not about rows', () => {
    expect(rowErrorsFromApi(new Error('offline'), change)).toEqual({});
    expect(rowErrorsFromApi(new ApiError(500, { message: 'boom' } as never), change)).toEqual({});
  });
});
