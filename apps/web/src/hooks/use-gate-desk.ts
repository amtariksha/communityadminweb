import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCurrentTenant } from '@/lib/auth';
import { orNullOn404 } from './use-gate-lists';

/** GET /gate/usage-summary (GATE-44): the five tiles of Usage Summary. */
export interface GateUsageSummary {
  entries_by_day: Array<{ day: string; visitors: number; staff: number; parcels: number; total: number }>;
  pre_approval: { checked_in: number; pre_approved: number; percent: number };
  resident_adoption: { pre_approvers: number; residents_with_app: number };
  exceptions: { overstay_alerts: number; denied_entries: number };
  panic_alerts: Record<string, number>;
}

/** A move at the gate desk (GATE-45): date, block, unit and type only. */
export interface GateMove {
  id: string;
  date: string;
  block: string | null;
  unit_number: string;
  type: 'move_in' | 'move_out';
  status: 'approved';
}

export interface GateMoveFilters {
  date_from?: string;
  date_to?: string;
  type?: 'move_in' | 'move_out';
  block?: string;
}

/** A guard-app user of the society (GATE-47). */
export interface GuardRosterRow {
  user_id: string;
  name: string | null;
  phone_last4: string | null;
  roles: string[];
  last_sign_in_at: string | null;
  is_active: boolean;
}

export function gateMoveParams(filters: GateMoveFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) if (value) params[key] = String(value);
  return params;
}

const tenantKey = () => getCurrentTenant() ?? '';

/** Each is null against an API that predates it (404). */
export function useGateUsage() {
  const tenantId = tenantKey();
  return useQuery({
    queryKey: ['gate-desk', 'usage', tenantId] as const,
    enabled: tenantId !== '',
    queryFn: () => orNullOn404(async () => (await api.get<{ data: GateUsageSummary }>('/gate/usage-summary')).data),
  });
}

export function useGateMoves(filters: GateMoveFilters) {
  const tenantId = tenantKey();
  const params = gateMoveParams(filters);
  return useQuery({
    queryKey: ['gate-desk', 'moves', tenantId, params] as const,
    enabled: tenantId !== '',
    queryFn: () => orNullOn404(() => api.get<{ data: GateMove[]; total: number }>('/gate/moves', { params })),
  });
}

export function useGuardRoster() {
  const tenantId = tenantKey();
  return useQuery({
    queryKey: ['gate-desk', 'roster', tenantId] as const,
    enabled: tenantId !== '',
    queryFn: () => orNullOn404(async () => (await api.get<{ data: GuardRosterRow[] }>('/gate/guard-roster')).data),
  });
}
