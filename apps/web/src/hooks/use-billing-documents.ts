'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BillingDocumentsSettings } from '@communityos/shared';
import { api } from '@/lib/api';
import { saveBlob } from '@/lib/download';

/**
 * How the society's invoices, receipts and credit notes look (INC-39 –
 * INC-42): Income Tracker › Setup › Customize Invoice and Other. Reads say
 * "not available yet" on a server without the routes (404), so they neither
 * retry nor toast.
 */

export interface IssuerAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
}

/** The stored settings resolved with the defaults (as the PDFs print them). */
export interface DocumentLook {
  titleWithoutGst: string;
  titleWithGst: string;
  issuerName: string | null;
  issuerAddress: IssuerAddress | null;
  serviceTaxNo: string | null;
  gstinEffectiveFrom: string | null;
  showLastReceipts: number;
  entityNames: { maintenance: string; utility: string; non_member: string };
  paymentInstructionsHtml: string | null;
  letterheadKey: string | null;
  logoOnReceipt: boolean;
  showInterestBreakup: boolean;
  publishDues: boolean;
  excludedBankAccountIds: string[];
}

export interface DocumentSettings {
  stored: BillingDocumentsSettings;
  look: DocumentLook;
  letterhead_url: string | null;
}

/** What PUT /billing-documents/settings takes: any subset; the server merges it. */
export type DocumentSettingsInput = Omit<BillingDocumentsSettings, 'letterhead_object_key'>;

export type SampleType = 'invoice' | 'receipt' | 'credit_note';

/** Number-range series and what a range sets (INC-40). */
export type RangeSeries = 'member_invoice' | 'member_receipt' | 'utility_invoice' | 'non_member_invoice' | 'non_member_receipt';
export type RangeKind = 'footer' | 'prefix' | 'header_title' | 'period';
export type RangeFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export interface DocumentRange {
  id: string;
  series: RangeSeries;
  kind: RangeKind;
  from_number: number;
  to_number: number | null;
  footer_html: string | null;
  prefix: string | null;
  header_title: string | null;
  frequency: RangeFrequency | null;
  period_wording: string | null;
}

/** The ranges of one series and kind, and the last number the series issued. */
export interface DocumentRangeList {
  data: DocumentRange[];
  current_number: number;
}

/** One row of PUT /billing-document-ranges; kept rows carry their id. */
export interface RangeRowInput {
  id?: string;
  from_number: number;
  to_number: number | null;
  footer_html?: string | null;
  prefix?: string | null;
  header_title?: string | null;
  frequency?: RangeFrequency | null;
  period_wording?: string | null;
}

export interface SaveRangesInput {
  series: RangeSeries;
  kind: RangeKind;
  rows: RangeRowInput[];
}

export const billingDocumentKeys = {
  settings: ['billing-documents', 'settings'] as const,
  ranges: (series: RangeSeries, kind: RangeKind) => ['billing-document-ranges', series, kind] as const,
};

export function useDocumentSettings() {
  return useQuery({
    queryKey: billingDocumentKeys.settings,
    meta: { suppressToast: true },
    retry: false,
    queryFn: () => api.get<{ data: DocumentSettings }>('/billing-documents/settings').then((res) => res.data),
  });
}

export function useSaveDocumentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: DocumentSettingsInput) =>
      api
        .put<{ data: Omit<DocumentSettings, 'letterhead_url'> }>('/billing-documents/settings', fields)
        .then((res) => res.data),
    onSuccess: (view) => {
      // The save answers without the letterhead link; the one held is still valid.
      queryClient.setQueryData<DocumentSettings>(billingDocumentKeys.settings, (old) => ({
        ...view,
        letterhead_url: old?.letterhead_url ?? null,
      }));
    },
  });
}

/** Downloads a sample PDF of the type, drawn with today's settings. */
export function useDownloadSample() {
  return useMutation({
    mutationFn: async (type: SampleType) => {
      const blob = await api.download('/billing-documents/sample', { params: { type } });
      saveBlob(blob, `sample-${type.replace('_', '-')}.pdf`);
    },
  });
}

export function useDocumentRanges(series: RangeSeries, kind: RangeKind) {
  return useQuery({
    queryKey: billingDocumentKeys.ranges(series, kind),
    meta: { suppressToast: true },
    retry: false,
    queryFn: () => api.get<DocumentRangeList>('/billing-document-ranges', { params: { series, kind } }),
  });
}

/** Replaces the series' ranges of the kind with the rows sent. */
export function useSaveDocumentRanges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveRangesInput) =>
      api.put<{ data: DocumentRange[] }>('/billing-document-ranges', input).then((res) => res.data),
    onSuccess: (ranges, input) => {
      queryClient.setQueryData<DocumentRangeList>(billingDocumentKeys.ranges(input.series, input.kind), (old) => ({
        data: ranges,
        current_number: old?.current_number ?? 0,
      }));
    },
  });
}

/** Setup › Other › Upload letter head (INC-42): a JPG or PNG up to 1 MB. */
export function useUploadLetterhead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api.post<{ data: Omit<DocumentSettings, 'letterhead_url'> }>('/billing-documents/letterhead', body).then((res) => res.data);
    },
    // The answer has no link to the new image; reading again signs one.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billingDocumentKeys.settings }),
  });
}

/** Takes the letterhead off the documents. */
export function useRemoveLetterhead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ data: Omit<DocumentSettings, 'letterhead_url'> }>('/billing-documents/letterhead').then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: billingDocumentKeys.settings }),
  });
}
