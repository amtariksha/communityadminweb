'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api, API_BASE_URL } from '@/lib/api';
import { getToken, getCurrentTenant } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TallyExportOptions {
  from_date: string;
  to_date: string;
  include_groups?: boolean;
  include_ledgers?: boolean;
  include_vouchers?: boolean;
  include_audit_trail?: boolean;
}

export interface TallyExportPreview {
  groups_count: number;
  ledgers_count: number;
  vouchers_count: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const tallyExportKeys = {
  all: ['tally-export'] as const,
  preview: (options: TallyExportOptions) => [...tallyExportKeys.all, 'preview', options] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTallyExportPreview(options: TallyExportOptions) {
  const params: Record<string, string> = {
    from_date: options.from_date,
    to_date: options.to_date,
  };
  if (options.include_groups !== undefined) params.include_groups = String(options.include_groups);
  if (options.include_ledgers !== undefined) params.include_ledgers = String(options.include_ledgers);
  if (options.include_vouchers !== undefined) params.include_vouchers = String(options.include_vouchers);
  if (options.include_audit_trail !== undefined) params.include_audit_trail = String(options.include_audit_trail);

  return useQuery({
    queryKey: tallyExportKeys.preview(options),
    queryFn: function fetchPreview() {
      return api
        .get<{ data: TallyExportPreview }>('/tally-import/export/preview', { params })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: Boolean(options.from_date) && Boolean(options.to_date),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useTallyExport() {
  return useMutation({
    mutationFn: async function exportTally(options: TallyExportOptions) {
      // The server returns raw XML; we cannot route this through
      // `api.post()` because that wrapper calls `response.json()`
      // unconditionally, which throws on `<ENVELOPE>...` and surfaces
      // as a failed mutation even though the server returned 201 OK
      // with valid XML attached. Mirrors the `useDownloadInvoicePdf`
      // pattern in use-tally-import.ts: raw fetch with explicit
      // Authorization + tenant headers and `credentials: 'include'`
      // so the httpOnly refresh cookie is sent (QA #57 cookie flow).
      const token = getToken();
      const tenantId = getCurrentTenant();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/xml, text/xml',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenantId) headers['x-tenant-id'] = tenantId;

      const response = await fetch(`${API_BASE_URL}/tally-import/export`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(
          `Tally export failed (${response.status})${errText ? `: ${errText.slice(0, 200)}` : ''}`,
        );
      }

      const xmlContent = await response.text();
      if (!xmlContent || xmlContent.length === 0) {
        throw new Error('Tally export returned an empty document');
      }

      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tally-export-${options.from_date}-to-${options.to_date}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
