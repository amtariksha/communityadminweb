import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UnitBillingCategory } from '@/hooks/use-unit-billing-categories';
import { area2Error, billingFieldsPayload, UnitBillingFields } from './unit-billing-fields';

const TYPES: UnitBillingCategory[] = [
  { id: 't1', name: 'General', gst_threshold_applies: true, sort_order: 10, unit_count: 3, total_sqft1: 3000, total_sqft2: 0 },
  { id: 't2', name: 'Penthouse', gst_threshold_applies: true, sort_order: 20, unit_count: 1, total_sqft1: 1200, total_sqft2: 300 },
];

describe('Unit billing fields (INC-15)', () => {
  it('offers the society’s unit types and the second area', () => {
    const onType = vi.fn();
    render(<UnitBillingFields types={TYPES} typeId="" onTypeChange={onType} area2="" onArea2Change={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Unit type (billing)'), { target: { value: 't2' } });
    expect(onType).toHaveBeenCalledWith('t2');
    expect(screen.getByLabelText('Area 2 (sq ft)')).toBeTruthy();
  });

  it('leaves the type out when the server has no unit types yet', () => {
    render(<UnitBillingFields types={null} typeId="" onTypeChange={vi.fn()} area2="300" onArea2Change={vi.fn()} />);
    expect(screen.queryByLabelText('Unit type (billing)')).toBeNull();
    expect(billingFieldsPayload(null, 't1', '300')).toEqual({ garden_area: 300 });
  });

  it('sends the type (or null) with the area', () => {
    expect(billingFieldsPayload(TYPES, 't2', '300')).toEqual({ garden_area: 300, billing_category_id: 't2' });
    expect(billingFieldsPayload(TYPES, '', '')).toEqual({ garden_area: null, billing_category_id: null });
  });

  it('accepts a blank or positive second area only', () => {
    expect(area2Error('')).toBeNull();
    expect(area2Error('12.5')).toBeNull();
    expect(area2Error('0')).not.toBeNull();
    expect(area2Error('-3')).not.toBeNull();
  });
});
