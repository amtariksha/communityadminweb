import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StaffCategory } from '@/hooks/use-staff-categories';
import { StaffCategoriesGrid } from './categories-grid';

/**
 * Staff Manager › Setup › Set up Staff Categories (STAFF-41): name,
 * Official / Domestic and Gate access edited in place, one Save Changes;
 * a Domestic category never gives the guard app.
 */

const category = (id: string, name: string, over: Partial<StaffCategory> = {}): StaffCategory => ({
  id,
  name,
  kind: 'official',
  grants_guard_role: false,
  is_active: true,
  sort_order: 1,
  legacy_type: null,
  ...over,
});

const CATEGORIES = [category('c1', 'Security Guard', { grants_guard_role: true }), category('c2', 'House Maids', { kind: 'domestic' })];
const cell = (header: string, row: number) => screen.getByLabelText(`${header}, row ${row}`) as HTMLInputElement;
const saveChanges = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  });
};

describe('Staff categories grid', () => {
  it('saves a new Official category with Gate access in one request', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<StaffCategoriesGrid categories={CATEGORIES} readOnly={false} isSaving={false} save={save} />);

    fireEvent.change(cell('Category', 3), { target: { value: 'Lift Operator' } });
    fireEvent.click(cell('Gate access', 3));
    await saveChanges();

    expect(save).toHaveBeenCalledWith([
      { id: 'c1', name: 'Security Guard', kind: 'official', grants_guard_role: true, is_active: true },
      { id: 'c2', name: 'House Maids', kind: 'domestic', grants_guard_role: false, is_active: true },
      { name: 'Lift Operator', kind: 'official', grants_guard_role: true, is_active: true },
    ]);
  });

  it('refuses Gate access on a Domestic category before sending', async () => {
    const save = vi.fn();
    render(<StaffCategoriesGrid categories={CATEGORIES} readOnly={false} isSaving={false} save={save} />);

    fireEvent.click(cell('Gate access', 2));
    await saveChanges();

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Only society (Official) staff get the guard app.');
  });
});
