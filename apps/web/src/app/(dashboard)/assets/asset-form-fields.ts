import type { Asset } from '@/hooks/use-assets';

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
  };
}

/** The same rules in the dialog and on the page (SB-07); null when valid. */
export function assetFormError(values: AssetFormValues, byCategory = false): string | null {
  if (!values.name.trim()) return 'Enter the asset name.';
  if (byCategory && !values.categoryId) return 'Choose the category.';
  if (!values.location.trim()) return 'Enter where the asset is.';
  if (values.purchaseCost && !(Number(values.purchaseCost) >= 0)) return 'The purchase cost must be zero or more.';
  if (values.assetCode.trim().length > 100) return 'An asset code is at most 100 characters.';
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
  };
}
