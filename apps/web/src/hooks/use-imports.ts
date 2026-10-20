'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { saveBlob } from '@/lib/download';
import { isNotDeployed } from '@/lib/not-deployed';

/**
 * SB-13 — spreadsheet imports. Every module serves its imports under its
 * own prefix (`/units/imports`, `/purchases/imports` …) with the same four
 * routes: `:type/template`, `:type/preview`, `:type/apply` and `batches`.
 * The browser keeps the picked file and sends it to both preview and
 * apply; the API reads and checks it again before anything is written.
 */

export interface ImportRowIssue {
  field?: string;
  message: string;
}

export type ImportRowAction = 'create' | 'update' | 'post' | 'skip';

export interface ImportPreviewRow {
  row: number;
  action: ImportRowAction;
  note?: string;
  errors: ImportRowIssue[];
  values: Record<string, string>;
}

export interface ImportPreview {
  batch_id: string;
  type: string;
  file_name: string | null;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  skip_rows: number;
  invalid_rows: 'block' | 'skip';
  can_apply: boolean;
  already_applied: { id: string; applied_at: string; applied_by_name: string | null } | null;
  rows: ImportPreviewRow[];
}

export interface ImportCommitRow {
  row: number;
  status: 'created' | 'updated' | 'posted' | 'skipped' | 'error';
  message?: string;
  id?: string;
}

export interface ImportCommitResult {
  batch_id: string;
  type: string;
  total_rows: number;
  created: number;
  updated: number;
  posted: number;
  skipped: number;
  error_rows: number;
  rows: ImportCommitRow[];
  totals: Record<string, number>;
}

export interface ImportBatch {
  id: string;
  import_type: string;
  file_name: string | null;
  status: 'previewed' | 'applied' | 'failed';
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  applied_rows: number;
  summary_json: Record<string, unknown>;
  created_by_name: string | null;
  applied_by_name: string | null;
  created_at: string;
  applied_at: string | null;
}

/** Where an import lives: the module's prefix and the type's name. */
export interface ImportTarget {
  endpoint: string;
  type: string;
}

/** What one upload sends: the file (or the grid's rows), the type's options, and on commit the preview's id. */
export interface ImportRequest {
  file?: File;
  rows?: Array<Record<string, unknown>>;
  options?: Record<string, unknown>;
  batchId?: string;
}

/** Largest file the API takes (4.5 MB). */
export const IMPORT_MAX_FILE_BYTES = Math.floor(4.5 * 1024 * 1024);

export const importKeys = {
  all: ['imports'] as const,
  batches: (endpoint: string, type?: string) => [...importKeys.all, 'batches', endpoint, type ?? 'all'] as const,
};

function requestBody(input: ImportRequest): FormData | Record<string, unknown> {
  if (input.file) {
    const form = new FormData();
    form.append('file', input.file);
    if (input.options) form.append('options', JSON.stringify(input.options));
    if (input.batchId) form.append('batch_id', input.batchId);
    return form;
  }
  return { rows: input.rows ?? [], ...(input.options ? { options: input.options } : {}), ...(input.batchId ? { batch_id: input.batchId } : {}) };
}

export function useImportPreview(target: ImportTarget) {
  return useMutation({
    mutationFn: async function previewImport(input: ImportRequest): Promise<ImportPreview> {
      const response = await api.post<{ data: ImportPreview }>(`${target.endpoint}/${target.type}/preview`, requestBody(input));
      return response.data;
    },
  });
}

export function useImportApply(target: ImportTarget) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async function applyImport(input: ImportRequest): Promise<ImportCommitResult> {
      const response = await api.post<{ data: ImportCommitResult }>(`${target.endpoint}/${target.type}/apply`, requestBody(input));
      return response.data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...importKeys.all, 'batches', target.endpoint] }),
  });
}

export async function downloadImportTemplate(target: ImportTarget, format: 'xlsx' | 'csv'): Promise<void> {
  const blob = await api.download(`${target.endpoint}/${target.type}/template`, { params: { format } });
  saveBlob(blob, `${target.type.replace(/_/g, '-')}-template.${format}`);
}

/** The import log of a module (or one type); `null` while the API has no import routes. */
export function useImportBatches(endpoint: string, type?: string) {
  return useQuery({
    queryKey: importKeys.batches(endpoint, type),
    queryFn: async function loadImportBatches(): Promise<{ data: ImportBatch[]; total: number } | null> {
      try {
        return await api.get<{ data: ImportBatch[]; total: number }>(`${endpoint}/batches`, { params: { limit: '10', ...(type ? { type } : {}) } });
      } catch (error) {
        if (isNotDeployed(error)) return null;
        throw error;
      }
    },
  });
}
