import type { LinkedAsset } from '@/hooks/use-tickets';

/** "PMP-002 Booster pump 2", or the name alone without a code. */
export function linkedAssetTitle(asset: LinkedAsset): string {
  return asset.asset_code ? `${asset.asset_code} ${asset.name}` : asset.name;
}

/** Where the asset is: the location, then site, building, wing, floor and room, as given. */
export function linkedAssetPlace(asset: LinkedAsset): string {
  const parts = [asset.location, asset.site, asset.building, asset.wing, asset.floor, asset.room];
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(', ');
}

/** One line for the request page: title · place · status. */
export function linkedAssetLine(asset: LinkedAsset): string {
  return [linkedAssetTitle(asset), linkedAssetPlace(asset), asset.status ?? ''].filter(Boolean).join(' · ');
}
