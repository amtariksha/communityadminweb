'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isNotDeployed } from '@/lib/not-deployed';
import type { InvoiceBatchResult } from './use-utility-batch';
import { utilityKeys } from './use-utilities';

/**
 * Utility Tracker › Bulk Posting › Invoices in Batch (UTIL-15): a block's
 * meters with their last reading (GET /utilities/batch-post/meters) and the
 * one call that previews (dry run) or posts readings → bills → invoices
 * (POST /utilities/batch-post). The grid reads `null` from an API older
 * than these routes and says "not available yet".
 */

export type BatchMeterType = 'water' | 'electricity' | 'gas';

export interface BatchPeriod {
  meter_type: BatchMeterType;
  period_from: string;
  period_to: string;
}

export interface BatchGridMeter {
  meter_id: string;
  meter_number: string;
  unit_id: string;
  unit_number: string;
  block: string | null;
  last_reading_value: string | null;
  last_reading_date: string | null;
}

export interface BatchGrid {
  memorize: boolean | null;
  tariff_error: string | null;
  meters: BatchGridMeter[];
}

export interface BatchPostRowInput {
  meter_id: string;
  opening_reading?: number;
  closing_reading: number;
  reading_date: string;
  comment?: string;
}

export interface BatchPostRequest extends BatchPeriod {
  invoice_date: string;
  ledger_account_id?: string;
  post_now?: boolean;
  dry_run: boolean;
  rows: BatchPostRowInput[];
}

export interface BatchRowOutcome {
  row: number;
  meter_id: string;
  meter_number: string | null;
  unit_number: string | null;
  opening_reading: string | null;
  closing_reading: string;
  reading_date: string;
  consumption: string | null;
  amount: string | null;
  errors: string[];
  bill_id?: string;
}

export interface BatchPostResult {
  dry_run: boolean;
  memorize: boolean;
  rows: BatchRowOutcome[];
  readings_recorded: number;
  bills_created: number;
  invoices: InvoiceBatchResult | null;
}

const gridKey = (period: BatchPeriod, block: string | null) => [...utilityKeys.all, 'batch-grid', period, block ?? 'all'] as const;

export function useBatchGrid(period: BatchPeriod | null, block: string | null) {
  return useQuery({
    queryKey: period ? gridKey(period, block) : [...utilityKeys.all, 'batch-grid', 'none'],
    enabled: period !== null,
    queryFn: async function loadBatchGrid(): Promise<BatchGrid | null> {
      if (!period) return null;
      try {
        const params: Record<string, string> = { ...period, ...(block ? { block } : {}) };
        const response = await api.get<{ data: BatchGrid }>('/utilities/batch-post/meters', { params });
        return response.data;
      } catch (error) {
        if (isNotDeployed(error)) return null;
        throw error;
      }
    },
  });
}

export function useBatchPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async function batchPost(request: BatchPostRequest): Promise<BatchPostResult> {
      const response = await api.post<{ data: BatchPostResult }>('/utilities/batch-post', request);
      return response.data;
    },
    onSuccess: function refresh(result) {
      if (result.dry_run) return;
      for (const key of [utilityKeys.bills(), utilityKeys.readings(), utilityKeys.meters(), utilityKeys.stats(), [...utilityKeys.all, 'batch-grid'], ['invoices'], ['unit-ledger']]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
