import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { UnitBlock } from '@/hooks/use-unit-blocks';
import { BlocksGrid } from './blocks-grid';

const BLOCKS: UnitBlock[] = [
  { id: 'm1', name: 'A', display_order: 10, unit_count: 2 },
  // Only on units so far: saving adopts it into the master.
  { id: null, name: 'B', display_order: null, unit_count: 1 },
];

function renderGrid(save = vi.fn().mockResolvedValue(undefined), readOnly = false) {
  render(<BlocksGrid blocks={BLOCKS} readOnly={readOnly} isSaving={false} save={save} />);
  return save;
}

const nameBox = (row: number) => screen.getByLabelText(`Block, row ${row}`) as HTMLInputElement;
const type = (row: number, value: string) => fireEvent.change(nameBox(row), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

describe('Block master grid (SB-10 on SB-08)', () => {
  it('shows each block with its unit count, then spare rows', () => {
    renderGrid();

    expect(nameBox(1).value).toBe('A');
    expect(nameBox(2).value).toBe('B');
    expect(screen.getByRole('table', { name: 'Blocks' }).textContent).toContain('2');
    expect(nameBox(5).value).toBe('');
  });

  it('renames, adopts, adds and orders in one save, in grid order', async () => {
    const saveFn = renderGrid();

    type(1, 'tower a');
    type(3, ' club ');
    fireEvent.click(screen.getByRole('button', { name: 'Move row 2 up' }));
    save();

    expect(saveFn).toHaveBeenCalledWith([
      { from_name: 'B', name: 'B' },
      { id: 'm1', name: 'TOWER A' },
      { name: 'CLUB' },
    ]);
  });

  it('refuses two blocks with one name before sending', () => {
    const saveFn = renderGrid();

    type(3, 'a');
    save();

    expect(screen.getAllByText('Block names must be different.')).toHaveLength(2);
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('refuses clearing the name of a saved block', () => {
    const saveFn = renderGrid();

    type(2, '  ');
    save();

    expect(screen.getByText('Enter a block name.')).toBeTruthy();
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('shows the server’s reason on the row it names', async () => {
    const refused = new ApiError(400, {
      message: 'One row could not be saved. Nothing was changed.',
      code: 'bulk_rows_invalid',
      errors: { 'rows.2.name': ['Another block is already called C.'] },
    } as never);
    renderGrid(vi.fn().mockRejectedValue(refused));

    type(3, 'C');
    save();

    expect((await screen.findByRole('alert')).textContent).toBe('Another block is already called C.');
  });

  it('is read-only for roles that may not change units', () => {
    renderGrid(vi.fn(), true);

    expect(nameBox(1).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
  });
});
