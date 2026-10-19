import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { UnitBillingCategory, UnitBillingCategoryList } from '@/hooks/use-unit-billing-categories';
import { UnitTypesGrid } from './unit-types-grid';
import { UnitTypesSummary } from './unit-types-card';

const TYPES: UnitBillingCategory[] = [
  { id: 't1', name: 'General', gst_threshold_applies: true, sort_order: 10, unit_count: 0, total_sqft1: 0, total_sqft2: 0 },
  { id: 't2', name: 'Penthouse', gst_threshold_applies: false, sort_order: 20, unit_count: 1, total_sqft1: 1200, total_sqft2: 300 },
];

function renderGrid(save = vi.fn().mockResolvedValue(undefined), readOnly = false) {
  render(<UnitTypesGrid types={TYPES} readOnly={readOnly} isSaving={false} save={save} />);
  return save;
}

const nameBox = (row: number) => screen.getByLabelText(`Unit type, row ${row}`) as HTMLInputElement;
const type = (row: number, value: string) => fireEvent.change(nameBox(row), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

describe('Unit types (INC-15)', () => {
  it('lists the saved types and three spare rows', () => {
    renderGrid();
    expect(nameBox(1).value).toBe('General');
    expect(nameBox(2).value).toBe('Penthouse');
    expect(nameBox(5).value).toBe('');
    expect(() => nameBox(6)).toThrow();
  });

  it('adds, renames and removes in one save', () => {
    const saveFn = renderGrid();
    type(1, '');
    type(2, 'Penthouse Deluxe');
    type(3, ' Shop ');
    save();
    expect(saveFn).toHaveBeenCalledWith([
      { id: 't1', name: '', gst_threshold_applies: true },
      { id: 't2', name: 'Penthouse Deluxe', gst_threshold_applies: false },
      { name: 'Shop', gst_threshold_applies: true },
    ]);
  });

  it('refuses two names that differ only by case before sending', () => {
    const saveFn = renderGrid();
    type(3, 'general');
    save();
    expect(screen.getAllByText('Unit type names must be different.')).toHaveLength(2);
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('shows why a type in use cannot be removed on its row', async () => {
    const refused = new ApiError(409, {
      message: "Cannot remove 'Penthouse': 1 unit use it.",
      code: 'unit_billing_category_in_use',
    } as never);
    renderGrid(vi.fn().mockRejectedValue(refused));
    type(2, '');
    save();
    expect((await screen.findByRole('alert')).textContent).toBe("Cannot remove 'Penthouse': 1 unit use it.");
  });

  it('summarises units and both areas per type, unassigned and in total', () => {
    const list: UnitBillingCategoryList = {
      data: TYPES,
      unassigned: { unit_count: 1, total_sqft1: 800, total_sqft2: 0 },
      total: { unit_count: 2, total_sqft1: 2000, total_sqft2: 300 },
    };
    render(<UnitTypesSummary list={list} />);
    const rows = screen.getAllByRole('row').map((row) => row.textContent);
    expect(rows).toEqual([
      'DistributionNo. of UnitsTotal Sq.ft 1Total Sq.ft 2',
      'General000',
      'Penthouse11,200300',
      'Unassigned18000',
      'Total22,000300',
    ]);
  });
});
