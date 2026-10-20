import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCurrentTenant } from '@/lib/auth';
import { orNullOn404 } from './use-gate-lists';

/** A gate incident (GATE-42): raised by a guard, closed by the gate admins with a remark. */
export interface GateIncident {
  id: string;
  incident_no: number;
  category_id: string;
  category_name: string;
  description: string;
  gate_id: string | null;
  gate_name: string | null;
  unit_id: string | null;
  unit_number: string | null;
  block: string | null;
  photo_urls: string[];
  occurred_at: string;
  raised_by: string;
  raised_by_name: string | null;
  status: 'open' | 'closed';
  closed_by: string | null;
  closed_by_name: string | null;
  closed_at: string | null;
  closing_remark: string | null;
  created_at: string;
}

export interface IncidentFilters {
  date_from?: string;
  date_to?: string;
  status?: 'open' | 'closed';
  category_id?: string;
  gate_id?: string;
  q?: string;
}

export const gateIncidentKeys = {
  all: ['gate-incidents'] as const,
  list: (tenantId: string, params: Record<string, string>) => [...gateIncidentKeys.all, tenantId, params] as const,
};

/** The filters as query parameters (the export takes the same). */
export function incidentParams(filters: IncidentFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}

/** One page of incidents; `data` is null when the API predates the log (404). */
export function useGateIncidents(filters: IncidentFilters & { page: number; limit: number }) {
  const tenantId = getCurrentTenant() ?? '';
  const params = incidentParams(filters as IncidentFilters);
  return useQuery({
    queryKey: gateIncidentKeys.list(tenantId, params),
    enabled: tenantId !== '',
    queryFn: () =>
      orNullOn404(() => api.get<{ data: GateIncident[]; total: number }>('/gate/incidents', { params })),
  });
}

export function useCloseIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function closeIncident(input: { id: string; closing_remark: string }) {
      return api.patch<{ data: GateIncident }>(`/gate/incidents/${input.id}/close`, { closing_remark: input.closing_remark });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: gateIncidentKeys.all });
    },
  });
}
