'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
  /** One India day, `YYYY-MM-DD`. */
  date?: string;
  gate_id?: string;
  is_recognized?: boolean;
  page: number;
  limit: number;
}

export function vehicleLogParams(filters: VehicleLogFilters): Record<string, string> {
  const params: Record<string, string> = { page: String(filters.page), limit: String(filters.limit) };
  if (filters.date) params.date = filters.date;
  if (filters.gate_id) params.gate_id = filters.gate_id;
  if (filters.is_recognized !== undefined) params.is_recognized = String(filters.is_recognized);
  return params;
}

/** The ANPR log with the API's own field names (Incident Investigator › Vehicle Logs). */
export function useVehicleLogs(filters: VehicleLogFilters) {
  return useQuery({
    queryKey: ['gate', 'vehicle-logs', filters] as const,
    queryFn: function fetchVehicleLogs() {
      return api.get<{ data: VehicleLog[]; total: number }>('/gate/anpr/logs', { params: vehicleLogParams(filters) });
    },
  });
}
