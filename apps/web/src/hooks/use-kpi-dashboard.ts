'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * `GET /analytics/kpi-dashboard`. Each section is computed on its own; a
 * section that failed arrives as `null` (all of its keys), and the page shows
 * "—" for it instead of a zero. The money figures (marked optional) are absent
 * altogether for a caller who may not read the books, such as a manager; the
 * page then leaves those cards out.
 */
export interface KpiBackendData {
  totalUnits: number | null;
  occupiedUnits: number | null;
  vacantUnits: number | null;
  activeResidents: number | null;
  ownersCount: number | null;
  tenantsCount: number | null;
  totalBilled?: number | null;
  totalCollected?: number | null;
  totalOutstanding?: number | null;
  collectionRate?: string | null;
  totalTickets: number | null;
  openTickets: number | null;
  resolvedTickets: number | null;
  slaBreaches: number | null;
  goldenQueueCount: number | null;
  parking: {
    total_slots: number;
    vacant_slots: number;
    occupied_slots: number;
    ev_slots: number;
  } | null;
  assets: {
    total_assets: number;
    active_assets: number;
    maintenance_assets: number;
  } | null;
  gate: {
    today_visitors: number;
    today_staff_entries: number;
    active_overstays: number;
  } | null;
  monthlyTrend?: Array<{
    month: string;
    income: number;
    expense: number;
  }> | null;
  /** SOS alerts still active or acknowledged. */
  sos_live: number | null;
  kyc_pending: number | null;
  bookings_today: number | null;
  patrol_rounds_today: number | null;
  /** Materials below their minimum stock. */
  low_stock_items: number | null;
  member_categories: number | null;
  journal_entries_month?: number | null;
}

export function useKpiDashboardData() {
  return useQuery({
    queryKey: ['analytics', 'kpi-dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data: KpiBackendData }>('/analytics/kpi-dashboard');
      return res.data;
    },
  });
}

export function useCountsSummary() {
  return useQuery({
    queryKey: ['analytics', 'counts-summary'],
    queryFn: async () => {
      const res = await api.get<{ data: { blocks: Array<{ block: string; total_flats: number; occupied_flats: number; vacant_flats: number }>; totalStaff: number; totalVehicles: number } }>('/analytics/counts-summary');
      return res.data;
    },
  });
}

export function useTicketsSummary() {
  return useQuery({
    queryKey: ['analytics', 'tickets-summary'],
    queryFn: async () => {
      const res = await api.get<{ data: { categories: Array<{ category: string; total: number; open_count: number; resolved_count: number; breached_count: number }> } }>('/analytics/tickets-summary');
      return res.data;
    },
  });
}

export function useStatisticsSummary() {
  return useQuery({
    queryKey: ['analytics', 'statistics-summary'],
    queryFn: async () => {
      const res = await api.get<{ data: { dailyFootfall: Array<{ date: string; visitors_count: number }> } }>('/analytics/statistics-summary');
      return res.data;
    },
  });
}
