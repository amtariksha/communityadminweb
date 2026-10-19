import type { Asset } from '@/hooks/use-assets';

export interface AssetFormValues {
  name: string;
  assetType: string;
  location: string;
  manufacturer: string;
  model: string;
  serial: string;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiry: string;
  condition: string;
}

const day = (value: string | null | undefined): string => (value ? value.split('T')[0] : '');

export function assetFormValues(asset?: Asset | null): AssetFormValues {
  return {
    name: asset?.name ?? '',
    assetType: asset?.asset_type ?? 'generator',
    location: asset?.location ?? '',
    manufacturer: asset?.manufacturer ?? '',
    model: asset?.model ?? '',
    serial: asset?.serial_number ?? '',
    purchaseDate: day(asset?.purchase_date),
    purchaseCost: asset?.purchase_cost != null && asset.purchase_cost !== 0 ? String(asset.purchase_cost) : '',
    warrantyExpiry: day(asset?.warranty_expiry),
    condition: asset?.condition ?? 'good',
  };
}

/** The same rules in the dialog and on the page (SB-07); null when valid. */
export function assetFormError(values: AssetFormValues): string | null {
  if (!values.name.trim()) return 'Enter the asset name.';
  if (!values.location.trim()) return 'Enter where the asset is.';
  if (values.purchaseCost && !(Number(values.purchaseCost) >= 0)) return 'The purchase cost must be zero or more.';
  return null;
}

export function assetPayload(values: AssetFormValues) {
  return {
    name: values.name.trim(),
    asset_type: values.assetType,
    location: values.location.trim(),
    manufacturer: values.manufacturer || undefined,
    model: values.model || undefined,
    serial_number: values.serial || undefined,
    purchase_date: values.purchaseDate || undefined,
    purchase_cost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
    warranty_expiry: values.warrantyExpiry || undefined,
    condition: values.condition || undefined,
  };
}
