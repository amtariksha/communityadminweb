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

export const billingDocumentKeys = {
  settings: ['billing-documents', 'settings'] as const,
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
