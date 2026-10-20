import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Amenity } from '@/hooks';
import { BookingAddonsField, chosenAddons } from './booking-addons-field';
import { savedAddonRows, toAddonRows, validateAddons, type AddonValues } from './addon-grid';
import type { GridRowState } from '@/components/editable-grid';

/** AMEN-42 — add-ons: the Setup grid's rows and the Reserve form's quantities. */

vi.mock('@/hooks/use-amenity-setup', () => ({
  useAmenityAddons: (amenityId: string) => ({
    data: amenityId ? [{ id: 'ad-1', amenity_id: amenityId, name: 'Chairs pack', max_units: 10, unit_cost: '150.00', is_active: true, display_order: 1 }] : [],
  }),
}));

const HALL = { id: 'am-1', name: 'Hall', pricing_type: 'per_day' } as Amenity;

describe('Reserve › Add-ons', () => {
  it('lists the add-ons of a paid amenity and reports the quantities typed', () => {
    const onChange = vi.fn();
    render(<BookingAddonsField amenity={HALL} value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/Chairs pack/), { target: { value: '2' } });

    expect(onChange).toHaveBeenCalledWith({ 'ad-1': '2' });
  });

  it('shows nothing for a free amenity', () => {
    const { container } = render(<BookingAddonsField amenity={{ ...HALL, pricing_type: 'free' }} value={{}} onChange={vi.fn()} />);
    expect(container.textContent).toBe('');
  });

  it('sends only the add-ons with a quantity', () => {
    expect(chosenAddons({ a: '2', b: '0', c: '', d: '1.5' })).toEqual([{ addon_id: 'a', quantity: 2 }]);
  });
});

describe('Setup › Add-ons grid', () => {
  const row = (values: Partial<AddonValues>, key = 'r'): GridRowState<AddonValues> => ({
    key, values: { name: '', maxUnits: '', unitCost: '', ...values }, inactive: false,
  });

  it('checks name, maximum units and cost', () => {
    expect(validateAddons([row({ name: 'X', maxUnits: '5', unitCost: '1' }, 'a'), row({ name: 'Chairs', maxUnits: '0', unitCost: '1' }, 'b'), row({}, 'spare')])).toEqual({
      a: 'An add-on name is 2 to 60 characters.',
      b: 'Maximum units is 1 to 99.',
    });
  });

  it('reads and saves rows whole', () => {
    const saved = savedAddonRows([{ id: 'ad-1', amenity_id: 'am-1', name: 'Chairs pack', max_units: 10, unit_cost: '150.00', is_active: false, display_order: 1 }]);
    expect(saved).toEqual([{ id: 'ad-1', inactive: true, values: { name: 'Chairs pack', maxUnits: '10', unitCost: '150.00' } }]);
    expect(
      toAddonRows({
        rows: [{ key: 'k', id: 'ad-1', values: { name: ' Chairs pack ', maxUnits: '10', unitCost: '150' }, inactive: true, position: 1, changed: true }],
        upserts: [],
        deactivations: [],
      }),
    ).toEqual([{ id: 'ad-1', name: 'Chairs pack', max_units: 10, unit_cost: 150, is_active: false }]);
  });
});
