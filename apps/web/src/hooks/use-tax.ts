'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GstSummary {
  total_taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  itc_available: number;
  net_gst_payable: number;
}

export interface GstReportRow {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  unit_number: string;
  taxable_amount: number;
  gst_rate: number;
  gst_amount: number;
  cgst: number;
  sgst: number;
  total: number;
}

export interface Gstr1Export {
  gstin: string;
  fp: string;
  b2b: unknown[];
  b2cs: Array<{
    sply_ty: string;
    pos: string;
    txval: number;
    camt: number;
    samt: number;
    rt: number;
  }>;
  summary: { total_invoices: number; total_taxable: number; total_tax: number };
}

export interface TdsSummary {
  tds_section: string;
  total_amount: number;
  tds_deducted: number;
  tds_deposited: number;
  tds_pending: number;
  vendor_count: number;
}

export interface Form16AData {
  vendor: { name: string; pan: string | null; address: string | null };
  deductor: { name: string; tan: string | null; pan: string | null };
  financial_year: { label: string; start_date: string; end_date: string };
  deductions: Array<{
    bill_number: string;
    bill_date: string;
    amount: number;
    tds_section: string;
    tds_rate: number;
    tds_amount: number;
  }>;
  challans: Array<{
    challan_number: string;
    payment_date: string;
    amount: number;
    bsr_code: string | null;
  }>;
  total_amount_paid: number;
  total_tds_deducted: number;
  total_tds_deposited: number;
}

export interface ComplianceItem {
  type: string;
  description: string;
  due_date: string;
  frequency: string;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  remittance_id?: string;
}

export interface TdsChallan {
  id: string;
  challan_number: string;
  tds_section: string;
  amount: number;
  payment_date: string;
  bsr_code: string | null;
  bank_name: string | null;
}

export interface Remittance {
  id: string;
  type: string;
  period: string;
  amount: number;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface TaxPeriodFilters {
  from_date?: string;
  to_date?: string;
  financial_year_id?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const taxKeys = {
  all: ['tax'] as const,
  gstSummary: (filters?: TaxPeriodFilters) => [...taxKeys.all, 'gst-summary', filters] as const,
  gstReport: (filters?: TaxPeriodFilters) => [...taxKeys.all, 'gst-report', filters] as const,
  gstr1Export: (period: string) => [...taxKeys.all, 'gstr1-export', period] as const,
  tdsSummary: (filters?: TaxPeriodFilters) => [...taxKeys.all, 'tds-summary', filters] as const,
  tdsReport: (filters?: TaxPeriodFilters) => [...taxKeys.all, 'tds-report', filters] as const,
  tdsVendors: (filters?: TaxPeriodFilters) => [...taxKeys.all, 'tds-vendors', filters] as const,
  form16a: (vendorId: string, fyId: string) => [...taxKeys.all, 'form16a', vendorId, fyId] as const,
  challans: () => [...taxKeys.all, 'challans'] as const,
  remittances: () => [...taxKeys.all, 'remittances'] as const,
  complianceCalendar: (fyId?: string) => [...taxKeys.all, 'compliance', fyId] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToParams(filters?: TaxPeriodFilters): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.financial_year_id) params.financial_year_id = filters.financial_year_id;
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useGstSummary(filters?: TaxPeriodFilters) {
  return useQuery({
    queryKey: taxKeys.gstSummary(filters),
    queryFn: function fetchGstSummary() {
      return api
        .get<{ data: GstSummary }>('/tax/gst/summary', { params: periodToParams(filters) })
        .then((res) => res.data);
    },
  });
}

export function useGstReport(filters?: TaxPeriodFilters) {
  return useQuery({
    queryKey: taxKeys.gstReport(filters),
    queryFn: function fetchGstReport() {
      return api
        .get<{ data: GstReportRow[] }>('/tax/gst/report', { params: periodToParams(filters) })
        .then((res) => res.data);
    },
  });
}

export function useGstr1Export(period: string) {
  return useQuery({
    queryKey: taxKeys.gstr1Export(period),
    queryFn: function fetchGstr1() {
      return api
        .get<{ data: Gstr1Export }>('/tax/gst/export', { params: { period } })
        .then((res) => res.data);
    },
    enabled: period !== '',
  });
}

export function useTdsSummary(filters?: TaxPeriodFilters) {
  return useQuery({
    queryKey: taxKeys.tdsSummary(filters),
    queryFn: function fetchTdsSummary() {
      return api
        .get<{ data: TdsSummary[] }>('/tax/tds/summary', { params: periodToParams(filters) })
        .then((res) => res.data);
    },
  });
}

export function useTdsVendors(filters?: TaxPeriodFilters) {
  return useQuery({
    queryKey: taxKeys.tdsVendors(filters),
    queryFn: function fetchTdsVendors() {
      return api
        .get<{ data: unknown[] }>('/tax/tds/vendors', { params: periodToParams(filters) })
        .then((res) => res.data);
    },
  });
}

export function useForm16A(vendorId: string, financialYearId: string) {
  return useQuery({
    queryKey: taxKeys.form16a(vendorId, financialYearId),
    queryFn: function fetchForm16A() {
      return api
        .get<{ data: Form16AData }>(`/tax/tds/form16a/${vendorId}`, {
          params: { financial_year_id: financialYearId },
        })
        .then((res) => res.data);
    },
    enabled: vendorId !== '' && financialYearId !== '',
  });
}

export function useChallans(tdsSection?: string, financialYearId?: string) {
  return useQuery({
    queryKey: taxKeys.challans(),
    queryFn: function fetchChallans() {
      const params: Record<string, string> = {};
      if (tdsSection) params.tds_section = tdsSection;
      if (financialYearId) params.financial_year_id = financialYearId;
      return api
        .get<{ data: TdsChallan[] }>('/tax/tds/challans', { params })
        .then((res) => res.data);
    },
  });
}

export function useRemittances(type?: string, financialYearId?: string) {
  return useQuery({
    queryKey: taxKeys.remittances(),
    queryFn: function fetchRemittances() {
      const params: Record<string, string> = {};
      if (type) params.type = type;
      if (financialYearId) params.financial_year_id = financialYearId;
      return api
        .get<{ data: Remittance[] }>('/tax/remittance', { params })
        .then((res) => res.data);
    },
  });
}

export function useComplianceCalendar(financialYearId?: string) {
  return useQuery({
    queryKey: taxKeys.complianceCalendar(financialYearId),
    queryFn: function fetchCalendar() {
      const params: Record<string, string> = {};
      if (financialYearId) params.financial_year_id = financialYearId;
      return api
        .get<{ data: { items: ComplianceItem[] } }>('/tax/compliance-calendar', { params })
        .then((res) => res.data);
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateChallan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createChallan(input: {
      challan_number: string;
      tds_section: string;
      amount: number;
      payment_date: string;
      bsr_code?: string;
      bank_name?: string;
    }) {
      return api.post('/tax/tds/challans', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: taxKeys.challans() });
      queryClient.invalidateQueries({ queryKey: taxKeys.complianceCalendar() });
    },
  });
}

export function useCreateRemittance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createRemittance(input: {
      type: string;
      period: string;
      amount: number;
      payment_date: string;
      reference_number?: string;
      notes?: string;
    }) {
      return api.post('/tax/remittance', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: taxKeys.remittances() });
      queryClient.invalidateQueries({ queryKey: taxKeys.complianceCalendar() });
    },
  });
}
