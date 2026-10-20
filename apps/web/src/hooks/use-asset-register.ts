'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { assetKeys, type Asset } from './use-assets';

export type AssetStatus = 'active' | 'under_maintenance' | 'decommissioned';

/** An asset as the classic register shows it. */
export type RegisterAsset = Asset & {
  asset_code?: string | null;
  description?: string | null;
  notes?: string | null;
  /** ASSET-18 — on the asset's own page; absent from an older API. */
  parts?: AssetPart[];
};

/** A part (sub-component) of an asset (ASSET-18). */
export interface AssetPart {
  id: string;
  name: string;
  asset_code: string | null;
  status: string;
  purchase_cost: string | null;
}

export interface AssetRegisterFilters {
  status?: AssetStatus;
  category?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface AssetRegisterPage {
  data: RegisterAsset[];
  total: number;
  /** Purchase cost of every matching asset; absent from an API older than ASSET-07. */
  total_value?: string;
}

/** The query string of the asset list and its export, without the page. */
export function assetRegisterParams(filters: Omit<AssetRegisterFilters, 'page' | 'limit'>): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.category) params.category = filters.category;
  if (filters.search) params.search = filters.search;
  return params;
}

/** Assets › Active / Under Service / Expired (ASSET-07). */
export function useAssetRegister(filters: AssetRegisterFilters) {
  return useQuery({
    queryKey: [...assetKeys.all, 'register', filters] as const,
    queryFn: () =>
      api.get<AssetRegisterPage>('/assets', {
        params: { ...assetRegisterParams(filters), page: String(filters.page), limit: String(filters.limit) },
      }),
    placeholderData: keepPreviousData,
  });
}

/** One asset, for its Edit page. */
export function useAssetDetail(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => api.get<{ data: RegisterAsset }>(`/assets/${id}`).then((res) => res.data),
    enabled: id !== '',
  });
}
