import type { Material } from '@/hooks/use-inventory';
import type { MaterialChange } from '@/hooks/use-inventory-list';

/**
 * Add Inventory / Edit item (ASSET-S10, ASSET-11): the values as typed, the
 * body for create (with the opening stock when the form shows it) and the
 * change for an edit (only what changed, never the quantity).
 */
export interface MaterialValues {
  name: string;
  category: string;
  unit: string;
  vendor_name: string;
  location: string;
  minimum_stock: string;
  reorder_quantity: string;
  unit_price: string;
  current_stock: string;
}

export const MATERIAL_CATEGORIES = ['Electrical', 'Plumbing', 'Housekeeping', 'Civil', 'Pool Chemicals', 'Security', 'General'] as const;
export const MATERIAL_UNITS = ['PCS', 'KG', 'LITERS', 'BOX', 'METERS', 'ROLL'] as const;

const text = (value: unknown): string => (value == null ? '' : String(value));
const amount = (value: unknown): string => (value == null || value === '' ? '' : String(Number(value)));

export function emptyMaterial(): MaterialValues {
  return { name: '', category: 'Electrical', unit: 'PCS', vendor_name: '', location: '', minimum_stock: '5', reorder_quantity: '', unit_price: '0', current_stock: '0' };
}

export function materialValues(item: Material): MaterialValues {
  return {
    name: item.name,
    category: item.category,
    unit: item.unit,
    vendor_name: text(item.vendor_name),
    location: text(item.location),
    minimum_stock: amount(item.minimum_stock),
    reorder_quantity: amount(item.reorder_quantity),
    unit_price: amount(item.unit_price),
    current_stock: amount(item.current_stock),
  };
}

const numberOrNull = (typed: string): number | null => (typed.trim() === '' ? null : Number(typed));

/** What is wrong, or null. Vendor Name is required (ASSET-S10). */
export function materialError(values: MaterialValues): string | null {
  if (!values.name.trim()) return 'Enter the inventory name.';
  if (!values.vendor_name.trim()) return 'Enter the vendor name.';
  for (const [label, typed] of [['Re-order Level', values.minimum_stock], ['Re-order Quantity', values.reorder_quantity], ['Cost per unit', values.unit_price]] as const) {
    const value = numberOrNull(typed);
    if (value !== null && !(value >= 0)) return `${label} must be zero or more.`;
  }
  return null;
}

export function createMaterialBody(values: MaterialValues, withOpeningStock: boolean): Record<string, unknown> {
  return {
    name: values.name.trim(),
    category: values.category,
    unit: values.unit,
    vendor_name: values.vendor_name.trim(),
    location: values.location.trim() || undefined,
    minimum_stock: numberOrNull(values.minimum_stock) ?? 5,
    reorder_quantity: numberOrNull(values.reorder_quantity),
    unit_price: numberOrNull(values.unit_price) ?? 0,
    ...(withOpeningStock ? { current_stock: numberOrNull(values.current_stock) ?? 0 } : {}),
  };
}

export function materialChange(before: MaterialValues, after: MaterialValues): MaterialChange {
  const change: MaterialChange = {};
  const changed = (key: keyof MaterialValues) => after[key].trim() !== before[key].trim();
  if (changed('name')) change.name = after.name.trim();
  if (changed('category')) change.category = after.category;
  if (changed('unit')) change.unit = after.unit;
  if (changed('vendor_name')) change.vendor_name = after.vendor_name.trim() || null;
  if (changed('location')) change.location = after.location.trim() || null;
  if (changed('minimum_stock')) change.minimum_stock = numberOrNull(after.minimum_stock) ?? 0;
  if (changed('reorder_quantity')) change.reorder_quantity = numberOrNull(after.reorder_quantity);
  if (changed('unit_price')) change.unit_price = numberOrNull(after.unit_price) ?? 0;
  return change;
}

/** Create PO from an item: its vendor and re-order quantity × cost per unit (ASSET-11). */
export function poPrefill(item: Pick<Material, 'vendor_name' | 'reorder_quantity' | 'unit_price'>): { vendor_name: string; total_amount: number } {
  const quantity = Number(item.reorder_quantity ?? 0);
  return { vendor_name: item.vendor_name ?? '', total_amount: Math.round(quantity * Number(item.unit_price ?? 0) * 100) / 100 };
}
