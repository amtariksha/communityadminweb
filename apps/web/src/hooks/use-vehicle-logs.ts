'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isLocked, unlockHeaders } from '@/lib/gate-unlock';

/** A number-plate read at a gate (`vehicle_logs`, GET /gate/anpr/logs). */
export interface VehicleLog {
  id: string;
  vehicle_number: string;
  direction: 'entry' | 'exit';
  is_recognized: boolean;
  logged_at: string;
  gate_name: string | null;
  unit_number: string | null;
  block?: string | null;
}

export interface VehicleLogFilters {
  /** One India day, `YYYY-MM-DD` (older screens). */
  date?: string;
  // GATE-43: an India day range, direction and part of a plate.
  date_from?: string;
  date_to?: string;
  direction?: 'entry' | 'exit';
  q?: string;
  gate_id?: string;
  is_recognized?: boolean;
  page: number;
  limit: number;
}

/** The filters without paging, as the list and its export take them. */
export function vehicleLogFilterParams(filters: Omit<VehicleLogFilters, 'page' | 'limit'>): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.date) params.date = filters.date;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.direction) params.direction = filters.direction;
  if (filters.q) params.q = filters.q;
  if (filters.gate_id) params.gate_id = filters.gate_id;
  if (filters.is_recognized !== undefined) params.is_recognized = String(filters.is_recognized);
  return params;
}

export function vehicleLogParams(filters: VehicleLogFilters): Record<string, string> {
  return { ...vehicleLogFilterParams(filters), page: String(filters.page), limit: String(filters.limit) };
}

/** The ANPR log with the API's own field names (Incident Investigator › Vehicle Logs). */
export function useVehicleLogs(filters: VehicleLogFilters) {
  return useQuery({
    queryKey: ['gate', 'vehicle-logs', filters] as const,
    queryFn: function fetchVehicleLogs() {
      return api.get<{ data: VehicleLog[]; total: number }>('/gate/anpr/logs', {
        params: vehicleLogParams(filters),
        headers: unlockHeaders('vehicles'),
      });
    },
    // GATE-43: a locked log is not retried; the page shows the lock panel.
    retry: (failures, error) => !isLocked(error) && failures < 1,
  });
}
