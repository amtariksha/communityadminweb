'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceRating {
  id: string;
  provider_name: string;
  provider_phone: string;
  service_type: string;
  rating: number;
  review: string;
  reviewer_name: string;
  is_verified: boolean;
  created_at: string;
}

export interface TopRatedProvider {
  provider_phone: string;
  provider_name: string;
  service_type: string;
  avg_rating: number;
  review_count: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface RatingFilters {
  service_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const ratingKeys = {
  all: ['ratings'] as const,
  lists: () => [...ratingKeys.all, 'list'] as const,
  list: (filters?: RatingFilters) => [...ratingKeys.lists(), filters] as const,
  topRated: () => [...ratingKeys.all, 'top'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ratingFiltersToParams(
  filters?: RatingFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.service_type) params.service_type = filters.service_type;
  if (filters.search) params.search = filters.search;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useServiceRatings(filters?: RatingFilters) {
  return useQuery({
    queryKey: ratingKeys.list(filters),
    queryFn: function fetchRatings() {
      return api.get<{ data: ServiceRating[]; total: number }>('/community/ratings', {
        params: ratingFiltersToParams(filters),
      });
    },
  });
}

export function useTopRated() {
  return useQuery({
    queryKey: ratingKeys.topRated(),
    queryFn: function fetchTopRated() {
      return api
        .get<{ data: TopRatedProvider[] }>('/community/ratings/top')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useVerifyRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function verifyRating(id: string) {
      return api.post<{ data: ServiceRating }>(`/community/ratings/${id}/verify`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ratingKeys.all });
    },
  });
}
