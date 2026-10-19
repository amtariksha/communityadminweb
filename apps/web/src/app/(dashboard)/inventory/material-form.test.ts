import { describe, expect, it } from 'vitest';
import type { Material } from '@/hooks/use-inventory';
import { createMaterialBody, emptyMaterial, materialChange, materialError, materialValues, poPrefill } from './material-form';

/** Add Inventory / Edit item (ASSET-11): vendor and re-order quantity, never the quantity on an edit. */
const ITEM = {
  id: 'm-1',
  item_code: 'BULB-9W',
  name: 'LED bulb 9W',
  category: 'Electrical',
  unit: 'PCS',
  current_stock: 10,
  minimum_stock: 5,
  unit_price: 25,
  location: 'Store A',
  vendor_name: 'Vendor A',
  reorder_quantity: '20.00',
  created_at: '2026-10-01',
} as Material;

describe('material form', () => {
  it('asks for the vendor', () => {
    expect(materialError({ ...emptyMaterial(), name: 'Mop' })).toBe('Enter the vendor name.');
    expect(materialError({ ...emptyMaterial(), name: 'Mop', vendor_name: 'Vendor B' })).toBeNull();
  });

  it('creates with the vendor and re-order quantity, and the opening stock only when shown', () => {
    const values = { ...emptyMaterial(), name: 'Mop', vendor_name: ' Vendor B ', reorder_quantity: '12', current_stock: '3' };
    expect(createMaterialBody(values, false)).toMatchObject({ vendor_name: 'Vendor B', reorder_quantity: 12 });
    expect(createMaterialBody(values, false)).not.toHaveProperty('current_stock');
    expect(createMaterialBody(values, true)).toMatchObject({ current_stock: 3 });
  });

  it('sends only what changed on an edit and never the quantity', () => {
    const before = materialValues(ITEM);
    const change = materialChange(before, { ...before, vendor_name: 'Vendor C', reorder_quantity: '', current_stock: '99' });
    expect(change).toEqual({ vendor_name: 'Vendor C', reorder_quantity: null });
  });

  it('prefills a purchase order from the item: vendor and re-order quantity × cost per unit', () => {
    expect(poPrefill(ITEM)).toEqual({ vendor_name: 'Vendor A', total_amount: 500 });
    expect(poPrefill({ ...ITEM, vendor_name: null, reorder_quantity: null })).toEqual({ vendor_name: '', total_amount: 0 });
  });
});
