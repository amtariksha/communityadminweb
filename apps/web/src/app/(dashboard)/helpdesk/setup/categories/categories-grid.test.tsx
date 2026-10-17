import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HelpdeskAssignee, HelpdeskCategory } from '@/hooks';
import { CategoriesGrid } from './categories-grid';

/**
 * Setup > Helpdesk Categories: one editable grid, saved in one go. Blank
 * spare rows are ignored, Delete only marks a row until Save Changes, and
 * nothing is sent while any row has an error.
 */

const OWNERS: HelpdeskAssignee[] = [
  { user_id: 'owner-1', name: 'Test Admin One', roles: ['community_admin'] },
  { user_id: 'owner-2', name: 'Test Admin Two', roles: ['accountant'] },
];

const CATEGORIES: HelpdeskCategory[] = [
  { id: 'cat-1', name: 'Plumbing', display_order: 10, owner_l1_user_id: 'owner-1', owner_l1_name: 'Test Admin One' },
  { id: 'cat-2', name: 'Electrical', display_order: 20, owner_l1_user_id: 'owner-2', owner_l1_name: 'Test Admin Two' },
];

function renderGrid(
  categories: HelpdeskCategory[] = CATEGORIES,
  props: Partial<React.ComponentProps<typeof CategoriesGrid>> = {},
) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <CategoriesGrid
      categories={categories}
      owners={OWNERS}
      isSaving={false}
      readOnly={false}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave };
}

const nameBox = (row: number) => screen.getByLabelText(`Category name, row ${row}`) as HTMLInputElement;
const ownerBox = (row: number) => screen.getByLabelText(`Owner, row ${row}`) as HTMLSelectElement;
const type = (row: number, value: string) => fireEvent.change(nameBox(row), { target: { value } });
const pickOwner = (row: number, value: string) => fireEvent.change(ownerBox(row), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

describe('CategoriesGrid', () => {
  it('numbers the saved rows and adds five blank rows after them', () => {
    renderGrid();

    expect(nameBox(1).value).toBe('Plumbing');
    expect(nameBox(2).value).toBe('Electrical');
    expect(nameBox(3).value).toBe('');
    expect(nameBox(7).value).toBe('');
    expect(screen.queryByLabelText('Category name, row 8')).toBeNull();
  });

  it('invites the first category when there are none', () => {
    renderGrid([]);

    expect(screen.getByText('Add your first category')).toBeTruthy();
    expect(nameBox(5)).toBeTruthy();
  });

  it('offers the admins of the society as owners', () => {
    renderGrid();

    const options = within(ownerBox(1)).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Select owner...', 'Test Admin One (community_admin)', 'Test Admin Two (accountant)']);
    expect(ownerBox(1).value).toBe('owner-1');
  });

  it('saves the rows in grid order and ignores the blank spare rows', () => {
    const { onSave } = renderGrid();

    type(3, 'Lifts');
    pickOwner(3, 'owner-2');
    save();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith([
      { id: 'cat-1', name: 'Plumbing', owner_l1_user_id: 'owner-1', display_order: 10 },
      { id: 'cat-2', name: 'Electrical', owner_l1_user_id: 'owner-2', display_order: 20 },
      { name: 'Lifts', owner_l1_user_id: 'owner-2', display_order: 30 },
    ]);
  });

  it('trims the name it sends', () => {
    const { onSave } = renderGrid();

    type(1, '  Plumbing & Water ');
    save();

    expect(onSave.mock.calls[0][0][0]).toMatchObject({ id: 'cat-1', name: 'Plumbing & Water' });
  });

  it('marks a row for deletion without removing it, and sends delete on save', () => {
    const { onSave } = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Delete row 1' }));

    expect(nameBox(1).className).toContain('line-through');
    save();
    expect(onSave.mock.calls[0][0][0]).toEqual({
      id: 'cat-1',
      name: 'Plumbing',
      owner_l1_user_id: 'owner-1',
      display_order: 10,
      delete: true,
    });
  });

  it('lets a marked row be restored before saving', () => {
    const { onSave } = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Delete row 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo delete row 1' }));
    save();

    expect(onSave.mock.calls[0][0][0].delete).toBeUndefined();
  });

  it('drops a deleted row that was never saved', () => {
    const { onSave } = renderGrid();

    type(3, 'Typo');
    pickOwner(3, 'owner-1');
    fireEvent.click(screen.getByRole('button', { name: 'Delete row 3' }));
    save();

    expect(onSave.mock.calls[0][0].map((row: { name: string }) => row.name)).toEqual(['Plumbing', 'Electrical']);
  });

  it('shows an error and sends nothing when a category has no owner', () => {
    const { onSave } = renderGrid();

    type(3, 'Lifts');
    save();

    expect(screen.getByText('Choose an owner for this category.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows an error and sends nothing when an owner is chosen without a name', () => {
    const { onSave } = renderGrid();

    pickOwner(3, 'owner-1');
    save();

    expect(screen.getByText('Enter a category name.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses two names that differ only in case', () => {
    const { onSave } = renderGrid();

    type(3, 'plumbing');
    pickOwner(3, 'owner-1');
    save();

    expect(screen.getAllByText('Category names must be different.').length).toBeGreaterThan(0);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not count a row marked for deletion as a clash', () => {
    const { onSave } = renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Delete row 1' }));
    type(3, 'Plumbing');
    pickOwner(3, 'owner-2');
    save();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('clears an error once the row is fixed', () => {
    const { onSave } = renderGrid();

    type(3, 'Lifts');
    save();
    pickOwner(3, 'owner-1');
    save();

    expect(screen.queryByText('Choose an owner for this category.')).toBeNull();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('adds five more blank rows on request', () => {
    renderGrid();

    fireEvent.click(screen.getByRole('button', { name: 'Add 5 more rows' }));

    expect(nameBox(12)).toBeTruthy();
  });

  it('cannot be edited or saved by a role that may only read', () => {
    renderGrid(CATEGORIES, { readOnly: true });

    expect(nameBox(1).disabled).toBe(true);
    expect(ownerBox(1).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete row 1' })).toBeNull();
  });
});
