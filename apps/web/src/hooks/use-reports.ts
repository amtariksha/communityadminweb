'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * The report registry (SB-12, REP-03): the catalogue of every report the
 * signed-in user may run in this society, and running one.
 */

export type ReportParamType =
  | 'period_preset'
  | 'date'
  | 'as_of_date'
  | 'date_range'
  | 'financial_year'
  | 'block'
  | 'unit'
  | 'ledger_account'
  | 'income_account'
  | 'account_group'
  | 'vendor'
  | 'select'
  | 'boolean'
  | 'number';

export interface CatalogueParam {
  key: string;
  label: string;
  type: ReportParamType;
  required: boolean;
  default?: unknown;
  options?: ReadonlyArray<{ value: string; label: string }>;
  account_types?: readonly string[];
}

export interface CatalogueRow {
  key: string;
  module: string;
  section: number;
  section_title: string;
  group: string | null;
  number: number | null;
  name: string;
  description: string | null;
  params: CatalogueParam[];
  fixed_params: Record<string, unknown>;
  schedulable: boolean;
  publishable: boolean;
  /** False: listed as Planned, no data source yet. */
  available: boolean;
  active_schedules: Array<{ id: string; frequency: string }>;
}

export type ReportColumnType = 'text' | 'date' | 'money' | 'number' | 'percent';

export interface ReportColumn {
  key: string;
  label: string;
  type: ReportColumnType;
  align?: 'left' | 'right' | 'center';
  link?: string;
}

export interface ReportSection {
  heading?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  totals?: { label: string; values: Record<string, string | number> };
}

export interface ReportResult {
  title: string;
  subtitle?: string;
  sections: ReportSection[];
}

export interface ReportRunResponse {
  data: ReportResult;
  run_id: string;
  total_rows: number;
  truncated: boolean;
}

export const reportKeys = {
  all: ['report-catalogue'] as const,
  catalogue: (module?: string) => [...reportKeys.all, 'catalogue', module ?? 'all'] as const,
};

/** The catalogue, or one module's section of it. 404 until the API ships it. */
export function useReportCatalogue(module?: string) {
  return useQuery({
    queryKey: reportKeys.catalogue(module),
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchReportCatalogue() {
      return api.get<{ data: CatalogueRow[] }>('/report-catalogue', module ? { params: { module } } : undefined);
    },
    select: (response) => response.data,
  });
}

/** Run a report with its options; every run is logged by the API. */
export function useRunReport(key: string) {
  return useMutation({
    mutationFn: function runReport(params: Record<string, unknown>) {
      return api.post<ReportRunResponse>(`/report-catalogue/${encodeURIComponent(key)}/run`, { params });
    },
  });
}
