import type { Asset } from '@/hooks/use-assets';

/** ASSET-18 — the asset this one is a part of. */
export interface ParentChoice {
  id: string;
  name: string;
}

export interface AssetFormValues {
  name: string;
  /** The fixed type, for an API without categories. */
  assetType: string;
  /** ASSET-16 — the society's category. */
  categoryId: string;
  location: string;
  manufacturer: string;
  model: string;
  serial: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiry: string;
  condition: string;
  /** ASSET-13 — blank on Add = the next AST- number. */
  assetCode: string;
  site: string;
  building: string;
  wing: string;
  floor: string;
  room: string;
  parent: ParentChoice | null;
  /** ASSET-19 — blank = the category's input; start blank = the purchase date. */
  depMethod: string;
  depRate: string;
  depLife: string;
  depResidual: string;
  depStart: string;
}

/** The detailed location parts (ASSET-S6) and their lengths. */
export const LOCATION_PARTS = [
  { key: 'site', label: 'Site', max: 100 },
  { key: 'building', label: 'Building', max: 100 },
  { key: 'wing', label: 'Wing', max: 50 },
  { key: 'floor', label: 'Floor', max: 50 },
  { key: 'room', label: 'Room', max: 100 },
] as const;

const day = (value: string | null | undefined): string => (value ? value.split('T')[0] : '');

export function assetFormValues(asset?: Asset | null): AssetFormValues {
  return {
    name: asset?.name ?? '',
    assetType: asset?.asset_type ?? 'generator',
    categoryId: asset?.category_id ?? '',
    location: asset?.location ?? '',
    manufacturer: asset?.manufacturer ?? '',
    model: asset?.model ?? '',
    serial: asset?.serial_number ?? '',
    purchaseDate: day(asset?.purchase_date),
    purchaseCost: asset?.purchase_cost != null && asset.purchase_cost !== 0 ? String(asset.purchase_cost) : '',
    warrantyExpiry: day(asset?.warranty_expiry),
    condition: asset?.condition ?? 'good',
    assetCode: asset?.asset_code ?? '',
    site: asset?.site ?? '',
    building: asset?.building ?? '',
    wing: asset?.wing ?? '',
    floor: asset?.floor ?? '',
    room: asset?.room ?? '',
    parent: asset?.parent_asset_id ? { id: asset.parent_asset_id, name: asset.parent_name ?? 'Parent asset' } : null,
    depMethod: asset?.depreciation_method ?? '',
    depRate: plainNumber(asset?.depreciation_rate),
    depLife: plainNumber(asset?.useful_life_years),
    depResidual: plainNumber(asset?.residual_percent),
    depStart: day(asset?.depreciation_start_date),
  };
}

function plainNumber(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '' : String(Number(value));
}

const numberOrNull = (text: string): number | null => (text.trim() === '' ? null : Number(text));

/** The same rules in the dialog and on the page (SB-07); null when valid. */
export function assetFormError(values: AssetFormValues, byCategory = false): string | null {
  if (!values.name.trim()) return 'Enter the asset name.';
  if (byCategory && !values.categoryId) return 'Choose the category.';
  if (!values.location.trim()) return 'Enter where the asset is.';
  if (values.purchaseCost && !(Number(values.purchaseCost) >= 0)) return 'The purchase cost must be zero or more.';
  if (values.assetCode.trim().length > 100) return 'An asset code is at most 100 characters.';
  return depreciationError(values);
}

/** ASSET-19 — the asset's own depreciation inputs, when given. */
function depreciationError(values: AssetFormValues): string | null {
  const rate = numberOrNull(values.depRate);
  const life = numberOrNull(values.depLife);
  const residual = numberOrNull(values.depResidual);
  if (rate !== null && !(rate > 0 && rate <= 100)) return 'The depreciation rate is more than 0 and at most 100%.';
  if (life !== null && !(Number.isInteger(life) && life >= 1 && life <= 100)) return 'The useful life is 1 to 100 whole years.';
  if (residual !== null && !(residual >= 0 && residual < 100)) return 'The residual value is 0 to 99.99% of cost.';
  return null;
}

/** `byCategory`: the API has the society's categories (ASSET-16), so the category id is sent, else the fixed type. */
export function assetPayload(values: AssetFormValues, byCategory = false) {
  return {
    name: values.name.trim(),
    ...(byCategory ? { category_id: values.categoryId } : { asset_type: values.assetType }),
    location: values.location.trim(),
    manufacturer: values.manufacturer || undefined,
    model: values.model || undefined,
    serial_number: values.serial || undefined,
    purchase_date: values.purchaseDate || undefined,
    purchase_cost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
    warranty_expiry: values.warrantyExpiry || undefined,
    condition: values.condition || undefined,
    // ASSET-13: a blank code is not sent (the API numbers a new asset; a code is never cleared).
    asset_code: values.assetCode.trim() || undefined,
    site: values.site.trim() || null,
    building: values.building.trim() || null,
    wing: values.wing.trim() || null,
    floor: values.floor.trim() || null,
    room: values.room.trim() || null,
    // ASSET-18: null stands the asset on its own.
    parent_asset_id: values.parent?.id ?? null,
    // ASSET-19: null = the category's input (the start: the purchase date).
    depreciation_method: (values.depMethod || null) as 'slm' | 'wdv' | null,
    depreciation_rate: numberOrNull(values.depRate),
    useful_life_years: numberOrNull(values.depLife),
    residual_percent: numberOrNull(values.depResidual),
    depreciation_start_date: values.depStart || null,
  };
}
