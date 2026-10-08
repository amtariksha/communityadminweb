'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface KpiBackendData {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  activeResidents: number;
  ownersCount: number;
  tenantsCount: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: string;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  slaBreaches: number;
  goldenQueueCount: number;
  parking: {
    total_slots: number;
    vacant_slots: number;
    occupied_slots: number;
    ev_slots: number;
  };
  assets: {
    total_assets: number;
    active_assets: number;
    maintenance_assets: number;
  };
  gate: {
    today_visitors: number;
    today_staff_entries: number;
    active_overstays: number;
  };
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
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
