'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { utilityKeys } from './use-utilities';

export type MeterType = 'water' | 'electricity' | 'gas';
export type MeterRuleStatus = 'active' | 'scheduled' | 'superseded' | 'ended';

/** GET /utilities/rules (UTIL-13). Amounts are NUMERIC strings. */
export interface MeterRule {
  id: string;
  meter_type: MeterType;
  ledger_account_id: string | null;
  ledger_account_name: string | null;
  ledger_account_code: string | null;
  memorize_readings: boolean;
  cumulative_slab: boolean;
  minimum_charge: string;
  effective_from: string;
  effective_to: string | null;
  revises_rule_id: string | null;
  status: MeterRuleStatus;
  in_use: boolean;
  slabs: Array<{ id: string; slab_from: string; slab_to: string | null; rate_per_unit: string }>;
}

export interface MeterRuleInput {
  ledger_account_id: string;
  memorize_readings: boolean;
  cumulative_slab: boolean;
  minimum_charge: number;
  effective_from: string;
  slabs: Array<{ upto: number | null; rate: number }>;
}

export const meterRuleKeys = {
  all: ['meter-rules'] as const,
  list: (history: boolean) => [...meterRuleKeys.all, 'list', history] as const,
};

export function useMeterRules(history = false) {
  return useQuery({
    queryKey: meterRuleKeys.list(history),
    // A server without meter rules answers 404: screens fall back to the slab list.
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchMeterRules() {
      return api
        .get<{ data: MeterRule[] }>('/utilities/rules', { params: history ? { history: 'true' } : {} })
        .then((res) => res.data);
    },
  });
}

function useRuleMutation<Input>(send: (input: Input) => Promise<{ data: MeterRule }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function writeMeterRule(input: Input) {
      return send(input).then((res) => res.data);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: meterRuleKeys.all });
      queryClient.invalidateQueries({ queryKey: utilityKeys.slabs() });
    },
  });
}

export function useCreateMeterRule() {
  return useRuleMutation((input: MeterRuleInput & { meter_type: MeterType }) =>
    api.post<{ data: MeterRule }>('/utilities/rules', input),
  );
}

export function useReviseMeterRule() {
  return useRuleMutation(({ id, ...input }: MeterRuleInput & { id: string }) =>
    api.post<{ data: MeterRule }>(`/utilities/rules/${id}/revise`, input),
  );
}

export function useEndMeterRule() {
  return useRuleMutation(({ id, effective_to }: { id: string; effective_to: string }) =>
    api.post<{ data: MeterRule }>(`/utilities/rules/${id}/end`, { effective_to }),
  );
}
