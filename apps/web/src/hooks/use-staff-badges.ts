'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** STAFF-31 — the badge print sheet (GET /staff/badges/cards, committee). */

export interface BadgeCard {
  badge_no: string;
  qr_token: string;
  kind: 'Official' | 'Domestic';
  name: string;
  category: string | null;
  status: string;
  badge_valid_until: string | null;
  units: string | null;
  /** A short-lived signed link, or null. */
  photo_url: string | null;
}

export interface BadgeSheetData {
  society_name: string;
  header_image_url: string | null;
  back_text: string;
  cards: BadgeCard[];
}

export interface BadgeSheetFilters {
  status: string;
  category: string;
  badge_from: string;
  badge_to: string;
}

export function badgeSheetParams(filters: BadgeSheetFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.category) params.category = filters.category;
  if (/^\d+$/.test(filters.badge_from)) params.badge_from = filters.badge_from;
  if (/^\d+$/.test(filters.badge_to)) params.badge_to = filters.badge_to;
  return params;
}

export function useBadgeSheet(filters: BadgeSheetFilters) {
  return useQuery({
    queryKey: ['staff', 'badge-sheet', filters],
    // The page says "not available yet" itself on an API without the route.
    meta: { suppressToast: true },
    queryFn: () => api.get<{ data: BadgeSheetData }>('/staff/badges/cards', { params: badgeSheetParams(filters) }).then((res) => res.data),
  });
}
