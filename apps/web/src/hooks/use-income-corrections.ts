'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { invoiceKeys } from '@/hooks/use-invoices';
import { unitLedgerKeys } from '@/hooks/use-unit-ledger';

/** INC-61 — Member Income › Bulk Corrections: the batch calls behind each grid (GL-25's journal corrections are use-bulk-corrections). */

export interface BatchOutcome {
  done: string[];
  errors: Array<{ id: string; message: string }>;
}

export interface ReallocationBatch {
  results: Array<{ unit_id: string; changed: boolean }>;
  errors: Array<{ unit_id: string; message: string }>;
}

export interface BillingRunReversal {
  run_id: string;
  period_label: string | null;
  cancelled: number;
  credit_notes: number;
}

function useInvalidatingMutation<Input, Output>(call: (input: Input) => Promise<Output>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: unitLedgerKeys.all });
    },
  });
}

export function useWaiveInterestBatch() {
  return useInvalidatingMutation((invoiceIds: string[]) =>
    api.post<{ data: BatchOutcome }>('/invoices/waive-interest/batch', { invoice_ids: invoiceIds }).then((res) => res.data),
  );
}

export function useReallocateUnitsBatch() {
  return useInvalidatingMutation((unitIds: string[]) =>
    api.post<{ data: ReallocationBatch }>('/unit-ledger/reallocate-fifo/batch', { unit_ids: unitIds, scope: 'member' }).then((res) => res.data),
  );
}

export function useReverseBillingRun() {
  return useInvalidatingMutation((input: { runId: string; reason: string }) =>
    api.post<{ data: BillingRunReversal }>(`/billing-runs/${input.runId}/reverse`, { reason: input.reason }).then((res) => res.data),
  );
}
