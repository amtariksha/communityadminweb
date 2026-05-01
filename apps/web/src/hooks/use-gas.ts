'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface GasPlan { id: string; name: string; amount: number; gas_units: number; is_active: boolean; created_at: string }
export interface GasWallet { id: string; unit_id: string; unit_number: string; balance: number; total_recharged: number; total_consumed: number }
export interface GasTransaction { id: string; unit_id: string; unit_number: string; type: string; amount: number; quantity: number; plan_name: string | null; notes: string | null; created_at: string }

// Backend GasStats shape (gas.service.ts:GasStats). The earlier
// interface used `total_plans / active_wallets / total_recharged /
// total_consumed` — none of those exist on the wire, so every stat
// card silently rendered `0` (the `?? 0` fallback). Names + types
// now match the wire contract verbatim, plus the QA #107
// physical-card flow counters added in the gas-flow reorientation.
export interface GasStats {
  total_wallets: number;
  total_balance_amount: number;
  total_balance_units: number;
  transactions_today: number;
  recharges_today: number;
  dispenses_today: number;
  pending_recharges_count: number;
  pending_recharges_amount: number;
  recharged_today_amount: number;
  dispensed_today_count: number;
}

// QA #107-admin — manual recharges paid via Razorpay that need
// security desk to physically dispense gas. Returned by
// GET /gas/recharges. Backend now JOINs users + units so the
// admin sees a verifiable name + unit + block at a glance instead
// of a UUID slice. `amount` is JSON-serialised as a string by pg
// for numeric(10,2) columns; the admin coerces to Number at the
// render site.
export interface GasManualRecharge {
  id: string;
  tenant_id: string;
  user_id: string;
  unit_id: string;
  amount: number | string;
  status: 'pending' | 'dispensed' | 'cancelled' | 'refunded';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  dispensed_by_user_id: string | null;
  dispensed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Enrichment fields (LEFT JOIN — null if user/unit was deleted).
  resident_name: string | null;
  resident_phone: string | null;
  unit_number: string | null;
  block: string | null;
  dispensed_by_name: string | null;
}

export const gasKeys = {
  all: ['gas'] as const,
  plans: () => [...gasKeys.all, 'plans'] as const,
  wallets: () => [...gasKeys.all, 'wallets'] as const,
  transactions: () => [...gasKeys.all, 'transactions'] as const,
  stats: () => [...gasKeys.all, 'stats'] as const,
  manualRecharges: (status: string) => [...gasKeys.all, 'manual-recharges', status] as const,
};

export function useGasPlans() { return useQuery({ queryKey: gasKeys.plans(), queryFn: () => api.get<{ data: GasPlan[] }>('/gas/plans').then(r => r.data) }); }
export function useGasWallets() { return useQuery({ queryKey: gasKeys.wallets(), queryFn: () => api.get<{ data: GasWallet[] }>('/gas/wallets').then(r => r.data) }); }
export function useGasTransactions(filters?: { unit_id?: string; type?: string; page?: number; limit?: number }) {
  return useQuery({ queryKey: [...gasKeys.transactions(), filters], queryFn: () => {
    const p: Record<string, string> = {};
    if (filters?.unit_id) p.unit_id = filters.unit_id;
    if (filters?.type) p.type = filters.type;
    if (filters?.page) p.page = String(filters.page);
    if (filters?.limit) p.limit = String(filters.limit);
    return api.get<{ data: GasTransaction[]; total: number }>('/gas/transactions', { params: p });
  }});
}
export function useGasStats() { return useQuery({ queryKey: gasKeys.stats(), queryFn: () => api.get<{ data: GasStats }>('/gas/stats').then(r => r.data) }); }

export function useCreateGasPlan() { const qc = useQueryClient(); return useMutation({ mutationFn: (input: { name: string; amount: number; gas_units: number }) => api.post('/gas/plans', input), onSuccess: () => qc.invalidateQueries({ queryKey: gasKeys.plans() }) }); }
export function useRechargeWallet() { const qc = useQueryClient(); return useMutation({ mutationFn: (input: { unit_id: string; amount: number; plan_id?: string }) => api.post('/gas/recharge', input), onSuccess: () => { qc.invalidateQueries({ queryKey: gasKeys.wallets() }); qc.invalidateQueries({ queryKey: gasKeys.transactions() }); qc.invalidateQueries({ queryKey: gasKeys.stats() }); } }); }
export function useDispenseGas() { const qc = useQueryClient(); return useMutation({ mutationFn: (input: { unit_id: string; quantity: number }) => api.post('/gas/dispense', input), onSuccess: () => { qc.invalidateQueries({ queryKey: gasKeys.wallets() }); qc.invalidateQueries({ queryKey: gasKeys.transactions() }); qc.invalidateQueries({ queryKey: gasKeys.stats() }); } }); }

// QA #107-admin — list manual recharges (default: status='pending').
// Backend gates this to super_admin / community_admin / accountant /
// security_guard. Returns max 200 rows ordered by created_at DESC.
//
// `status` accepts:
//   - 'pending'   → cards waiting to be dispensed (default)
//   - 'dispensed' → already-handed-out cards (history view)
//   - 'all'       → everything (translated to no `status` param)
//   - any other   → forwarded as-is
export function usePendingRecharges(
  status: string = 'pending',
  unitId?: string,
) {
  return useQuery({
    queryKey: [...gasKeys.manualRecharges(status), unitId ?? null] as const,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status && status !== 'all') params.status = status;
      if (unitId) params.unit_id = unitId;
      const res = await api.get<{ data: GasManualRecharge[] }>(
        '/gas/recharges',
        { params },
      );
      return res.data;
    },
  });
}

// QA #107-admin — flip a pending recharge to 'dispensed'. Backend
// stamps dispensed_by_user_id + dispensed_at and refuses non-pending
// rows (returns 4xx). Invalidates every recharge-list flavour
// (pending / dispensed / all / by-unit) plus the stats card data
// because pending_recharges_count + dispensed_today_count change
// on the same hop.
export function useDispenseRecharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ data: GasManualRecharge }>(`/gas/recharges/${id}/dispense`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: [...gasKeys.all, 'manual-recharges'],
      });
      qc.invalidateQueries({ queryKey: gasKeys.stats() });
      qc.invalidateQueries({ queryKey: gasKeys.wallets() });
      qc.invalidateQueries({ queryKey: gasKeys.transactions() });
    },
  });
}
