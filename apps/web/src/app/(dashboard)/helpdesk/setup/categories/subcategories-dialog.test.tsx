import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { HelpdeskCategory } from '@/hooks';
import { CategoriesGrid } from './categories-grid';
import { SubcategoriesDialog } from './subcategories-dialog';

/**
 * HELP-17: Setup › Helpdesk Categories gains Add/Edit sub-categories per
 * category, edited in their own grid (Sl.No · Sub-category · Delete, spare
 * rows, Save Changes).
 */

const PLUMBING: HelpdeskCategory = {
  id: 'cat-1',
  name: 'Plumbing',
  display_order: 10,
  owner_l1_user_id: 'owner-1',
  subcategories: [
    { id: 'sub-1', name: 'Leak', display_order: 0 },
    { id: 'sub-2', name: 'Blockage', display_order: 10 },
  ],
};

const subBox = (row: number) => screen.getByLabelText(`Sub-category, row ${row}`) as HTMLInputElement;

function renderDialog(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(<SubcategoriesDialog category={PLUMBING} readOnly={false} isSaving={false} onClose={vi.fn()} onSave={onSave} />);
  return { onSave };
}

describe('SubcategoriesDialog', () => {
  it('names the category and lists its sub-categories with spare rows', () => {
    renderDialog();

    expect(screen.getByText('Sub-categories of Plumbing')).toBeTruthy();
    expect(subBox(1).value).toBe('Leak');
    expect(subBox(2).value).toBe('Blockage');
    expect(subBox(3).value).toBe('');
  });

  it('saves the whole list in grid order, a deleted row marked, never removed', async () => {
    const { onSave } = renderDialog();
    fireEvent.change(subBox(3), { target: { value: 'Low pressure' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete row 2' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(onSave).toHaveBeenCalledWith('cat-1', [
      { id: 'sub-1', name: 'Leak', display_order: 10 },
      { id: 'sub-2', name: 'Blockage', display_order: 20, delete: true },
      { name: 'Low pressure', display_order: 30 },
    ]);
  });

  it('sends nothing while two rows share a name', async () => {
    const { onSave } = renderDialog();
    fireEvent.change(subBox(3), { target: { value: 'leak' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getAllByText('Sub-category names must be different.').length).toBeGreaterThan(0);
  });
});

describe('CategoriesGrid — SubCategories column', () => {
  const grid = (onEditSubcategories?: (category: HelpdeskCategory) => void) =>
    render(
      <CategoriesGrid
        categories={[PLUMBING]}
        owners={[{ user_id: 'owner-1', name: 'Test Admin', roles: ['community_admin'] }]}
        isSaving={false}
        readOnly={false}
        onSave={vi.fn()}
        onEditSubcategories={onEditSubcategories}
      />,
    );

  it('opens a saved category’s sub-categories, with their count', () => {
    const onEdit = vi.fn();
    grid(onEdit);

    fireEvent.click(screen.getByRole('button', { name: 'Sub-categories, row 1' }));

    expect(screen.getByRole('button', { name: 'Sub-categories, row 1' }).textContent).toBe('Add/Edit (2)');
    expect(onEdit).toHaveBeenCalledWith(PLUMBING);
    expect(screen.queryByRole('button', { name: 'Sub-categories, row 2' })).toBeNull();
  });

  it('is hidden while the API does not send sub-categories', () => {
    grid(undefined);

    expect(screen.queryByText('SubCategories')).toBeNull();
  });
});
