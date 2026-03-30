'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TallyImportResult {
  import_id: string;
  records_parsed: number;
  records_imported: number;
  records_skipped: number;
  records_failed: number;
  errors: Array<{ row?: number; message: string }>;
  summary: Record<string, number>;
}

export interface TallyImportHistory {
  id: string;
  import_type: string;
  source_type: string;
  file_name: string | null;
  records_parsed: number;
  records_imported: number;
  records_skipped: number;
  records_failed: number;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const tallyImportKeys = {
  all: ['tally-import'] as const,
  history: () => [...tallyImportKeys.all, 'history'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTallyImportHistory() {
  return useQuery({
    queryKey: tallyImportKeys.history(),
    queryFn: function fetchHistory() {
      return api
        .get<{ data: TallyImportHistory[] }>('/tally-import/history')
        .then((res) => res.data);
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useTallyXmlImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function importXml(input: {
      xml_content: string;
      import_type: 'groups' | 'ledgers' | 'vouchers' | 'all';
      file_name?: string;
    }) {
      return api.post<{ data: TallyImportResult }>(
        '/tally-import/xml',
        input,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tallyImportKeys.all });
      // Also invalidate accounts/ledger data since imports affect them
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useTallyCsvImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function importCsv(input: {
      csv_content: string;
      import_type:
        | 'trial_balance'
        | 'day_book'
        | 'ledger_report'
        | 'receipt_register'
        | 'payment_register';
      file_name?: string;
    }) {
      return api.post<{ data: TallyImportResult }>(
        '/tally-import/csv',
        input,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tallyImportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async function downloadPdf(invoiceId: string) {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      // Create download link
      const blob = new Blob([response as unknown as BlobPart], {
        type: 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
