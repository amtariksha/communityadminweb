'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** A row of the overstay ledger (`overstay_alerts`) with its unit (GATE-10). */
export interface OverstayAlert {
  id: string;
  subject_type: 'visitor' | 'staff' | 'vehicle';
  label: string | null;
  unit_number: string | null;
  block: string | null;
  entered_at: string;
  threshold_minutes: number;
  minutes_inside: number;
  status: 'open' | 'resolved';
  resolved_at: string | null;
}

export interface OverstayAlertFilters {
  status?: 'open' | 'resolved';
  page: number;
  limit: number;
}

export const overstayKeys = {
  all: ['gate', 'overstay'] as const,
  alerts: (filters: OverstayAlertFilters) => [...overstayKeys.all, 'alerts', filters] as const,
};

export function useOverstayAlerts(filters: OverstayAlertFilters) {
  return useQuery({
    queryKey: overstayKeys.alerts(filters),
    queryFn: function fetchOverstayAlerts() {
      const params: Record<string, string> = { page: String(filters.page), limit: String(filters.limit) };
      if (filters.status) params.status = filters.status;
      return api.get<{ data: OverstayAlert[]; total?: number }>('/gate/overstay/alerts', { params });
    },
  });
}

export function useResolveOverstayAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function resolveOverstayAlert(id: string) {
      return api.patch<{ data: OverstayAlert }>(`/gate/overstay/alerts/${id}/resolve`);
    },
    onSuccess: function invalidateOverstayAlerts() {
      void queryClient.invalidateQueries({ queryKey: overstayKeys.all });
    },
  });
}
