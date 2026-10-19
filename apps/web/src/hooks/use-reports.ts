'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  /** One of the society's helpdesk categories (HELP-21). */
  | 'ticket_category'
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
  schedules: (reportKey?: string) => [...reportKeys.all, 'schedules', reportKey ?? 'all'] as const,
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

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

/** A saved report schedule (REP-08). */
export interface ReportSchedule {
  id: string;
  report_key: string;
  params: Record<string, unknown>;
  frequency: ScheduleFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_quarter: number | null;
  time_of_day: string;
  format: 'pdf' | 'xlsx' | 'csv';
  deliver_email: boolean;
  recipient_roles: string[];
  recipient_user_ids: string[];
  recipient_emails: string[];
  deliver_notice: boolean;
  notice_audience: string | null;
  is_active: boolean;
  next_run_at: string;
  last_run_at: string | null;
}

export type ScheduleInput = Omit<ReportSchedule, 'id' | 'next_run_at' | 'last_run_at'>;

/** A report's schedules (or all of them). 404 until the API has schedules. */
export function useReportSchedules(reportKey?: string, enabled = true) {
  return useQuery({
    queryKey: reportKeys.schedules(reportKey),
    meta: { suppressToast: true },
    retry: false,
    enabled,
    queryFn: function fetchSchedules() {
      return api.get<{ data: ReportSchedule[] }>('/report-catalogue/schedules', reportKey ? { params: { report_key: reportKey } } : undefined);
    },
    select: (response) => response.data,
  });
}

export function useSaveSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveSchedule(input: { id?: string; body: Partial<ScheduleInput> }) {
      return input.id
        ? api.patch<{ data: ReportSchedule }>(`/report-catalogue/schedules/${input.id}`, input.body)
        : api.post<{ data: ReportSchedule }>('/report-catalogue/schedules', input.body);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useRunSchedule() {
  return useMutation({
    mutationFn: function runSchedule(id: string) {
      return api.post<{ data: { status: string; error_code?: string; emailed?: number } }>(`/report-catalogue/schedules/${id}/run`);
    },
  });
}

export interface PublishItem {
  key: string;
  params?: Record<string, unknown>;
  title?: string;
}

export interface PublishOutcome {
  key: string;
  status: 'published' | 'awaiting_approval' | 'failed';
  announcement_id?: string;
  publication_id?: string;
  error_code?: string;
}

/** Post reports to the notice board, one notice each (REP-09). */
export function usePublishReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function publishReports(body: { items: PublishItem[]; audience: string; expires_on?: string }) {
      return api.post<{ data: PublishOutcome[] }>('/report-catalogue/publish', body);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export type ReportLogAction =
  | 'viewed'
  | 'exported'
  | 'scheduled_run'
  | 'published'
  | 'schedule_created'
  | 'schedule_changed'
  | 'publication_retired';

/** One line of a report's Show Logs (REP-10). */
export interface ReportLogRow {
  at: string;
  user_id: string | null;
  user_name: string | null;
  report_key: string;
  report_name: string;
  options: Record<string, unknown> | null;
  action: ReportLogAction;
  format: string | null;
  row_count: number | null;
  result: string;
  error_code: string | null;
  announcement_id: string | null;
}

export interface ReportLogFilters {
  reportKey?: string;
  from?: string;
  to?: string;
  page?: number;
}

export function useReportLogs(filters: ReportLogFilters, enabled = true) {
  const params: Record<string, string> = { limit: '50', page: String(filters.page ?? 1) };
  if (filters.reportKey) params.report_key = filters.reportKey;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return useQuery({
    queryKey: [...reportKeys.all, 'logs', params] as const,
    meta: { suppressToast: true },
    retry: false,
    enabled,
    queryFn: function fetchReportLogs() {
      return api.get<{ data: ReportLogRow[]; total: number }>('/report-catalogue/logs', { params });
    },
  });
}
