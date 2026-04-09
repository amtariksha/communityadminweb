'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MarketplaceListing { id: string; title: string; description: string; price: number; category: string; condition: string; seller_name: string; unit_number: string; status: string; created_at: string }
export interface ServiceRating { id: string; provider_name: string; provider_phone: string; service_type: string; rating: number; review: string; reviewer_name: string; is_verified: boolean; created_at: string }

export const marketplaceKeys = {
  all: ['marketplace'] as const,
  listings: () => [...marketplaceKeys.all, 'listings'] as const,
  ratings: () => [...marketplaceKeys.all, 'ratings'] as const,
  topRated: () => [...marketplaceKeys.all, 'top-rated'] as const,
};

export function useMarketplaceListings(filters?: { category?: string; status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: [...marketplaceKeys.listings(), filters], queryFn: () => {
    const p: Record<string, string> = {};
    if (filters?.category) p.category = filters.category;
    if (filters?.status) p.status = filters.status;
    if (filters?.search) p.search = filters.search;
    if (filters?.page) p.page = String(filters.page);
    if (filters?.limit) p.limit = String(filters.limit);
    return api.get<{ data: MarketplaceListing[]; total: number }>('/marketplace', { params: p });
  }});
}

export function useServiceRatings(filters?: { service_type?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: [...marketplaceKeys.ratings(), filters], queryFn: () => {
    const p: Record<string, string> = {};
    if (filters?.service_type) p.service_type = filters.service_type;
    if (filters?.search) p.search = filters.search;
    if (filters?.page) p.page = String(filters.page);
    if (filters?.limit) p.limit = String(filters.limit);
    return api.get<{ data: ServiceRating[]; total: number }>('/community/ratings', { params: p });
  }});
}

export function useTopRated() { return useQuery({ queryKey: marketplaceKeys.topRated(), queryFn: () => api.get<{ data: unknown[] }>('/community/ratings/top').then(r => r.data) }); }

export function useRemoveListing() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => api.delete(`/marketplace/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: marketplaceKeys.listings() }) }); }
export function useVerifyRating() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => api.post(`/community/ratings/${id}/verify`), onSuccess: () => qc.invalidateQueries({ queryKey: marketplaceKeys.ratings() }) }); }
