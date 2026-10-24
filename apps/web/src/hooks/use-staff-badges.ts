'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { orNullOn404 } from './use-gate-lists';

/**
 * STAFF-31 — the badge print sheet (GET /staff/badges/cards, committee).
 * Release 4 — Rotate QR (POST /staff/badges/:id/rotate-qr) and the guards'
 * badge scan log (GET /staff/badges/scans); an older API has neither.
 */

const BADGE_SHEET_KEY = ['staff', 'badge-sheet'] as const;

export interface BadgeCard {
  /** Absent from an API without Rotate QR. */
  badge_id?: string;
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
  /** When a new QR was last issued; null = the badge's first one. */
  qr_rotated_at?: string | null;
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
    queryKey: [...BADGE_SHEET_KEY, filters],
    // The page says "not available yet" itself on an API without the route.
    meta: { suppressToast: true },
    queryFn: () => api.get<{ data: BadgeSheetData }>('/staff/badges/cards', { params: badgeSheetParams(filters) }).then((res) => res.data),
  });
}

export interface RotatedBadgeQr {
  badge_id: string;
  badge_no: string;
  qr_token: string;
  qr_rotated_at: string;
}

/** Issues a new QR for a badge; the printed one stops working at once. */
export function useRotateBadgeQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ badgeId, reason }: { badgeId: string; reason?: string }) =>
      (await api.post<{ data: RotatedBadgeQr }>(`/staff/badges/${badgeId}/rotate-qr`, reason ? { reason } : {})).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BADGE_SHEET_KEY }),
  });
}

export type BadgeScanResult = 'found' | 'inactive' | 'not_found';

export interface BadgeScanRow {
  id: string;
  scanned_at: string;
  scanned_by_name: string | null;
  gate_name: string | null;
  result: BadgeScanResult;
  badge_no: string | null;
  holder_name: string | null;
}

export interface BadgeScanFilters {
  date_from: string;
  date_to: string;
  result: '' | BadgeScanResult;
  page: number;
}

export const BADGE_SCAN_PAGE_SIZE = 25;

export function badgeScanParams(filters: BadgeScanFilters): Record<string, string> {
  const params: Record<string, string> = { page: String(filters.page), limit: String(BADGE_SCAN_PAGE_SIZE) };
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.result) params.result = filters.result;
  return params;
}

/** null against an API without the scan log (404). */
export function useBadgeScans(filters: BadgeScanFilters) {
  const params = badgeScanParams(filters);
  return useQuery({
    queryKey: ['staff', 'badge-scans', params] as const,
    queryFn: () => orNullOn404(() => api.get<{ data: BadgeScanRow[]; total: number }>('/staff/badges/scans', { params })),
  });
}
