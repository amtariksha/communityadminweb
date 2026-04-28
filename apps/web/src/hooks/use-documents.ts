'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DocumentCategory, Document as SocietyDocument } from '@communityos/shared';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface DocumentFilters {
  category_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateCategoryInput {
  name: string;
  parent_id?: string | null;
  sort_order?: number;
}

interface UploadDocumentInput {
  category_id: string;
  title: string;
  description?: string | null;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  access_level?: string;
  entity_type?: string;
  entity_id?: string;
  expiry_date?: string;
  tags?: string[];
}

interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  category_id?: string;
  access_level?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const documentKeys = {
  all: ['documents'] as const,
  categories: () => [...documentKeys.all, 'categories'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters?: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  expiring: (days: number) => [...documentKeys.all, 'expiring', days] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: DocumentFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.category_id) params.category_id = filters.category_id;
  if (filters.search) params.search = filters.search;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Category queries
// ---------------------------------------------------------------------------

export function useDocumentCategories() {
  return useQuery({
    queryKey: documentKeys.categories(),
    queryFn: function fetchDocumentCategories() {
      return api
        .get<{ data: DocumentCategory[] }>('/documents/categories')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Category mutations
// ---------------------------------------------------------------------------

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createCategory(input: CreateCategoryInput) {
      return api.post<{ data: DocumentCategory }>('/documents/categories', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: documentKeys.categories() });
    },
  });
}

// ---------------------------------------------------------------------------
// Document queries
// ---------------------------------------------------------------------------

export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: function fetchDocuments() {
      return api.get<PaginatedResponse<SocietyDocument>>('/documents', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: function fetchDocument() {
      return api
        .get<{ data: SocietyDocument }>(`/documents/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useExpiringDocuments(days: number) {
  return useQuery({
    queryKey: documentKeys.expiring(days),
    queryFn: function fetchExpiringDocuments() {
      return api
        .get<{ data: SocietyDocument[] }>('/documents/expiring', {
          params: { days: String(days) },
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: days > 0,
  });
}

// ---------------------------------------------------------------------------
// Document mutations
// ---------------------------------------------------------------------------

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function uploadDocument(input: UploadDocumentInput) {
      return api.post<{ data: SocietyDocument }>('/documents', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

/**
 * Three-step direct-to-object-store upload (eassylife pattern).
 *
 *   1. Backend signs a time-boxed PUT URL with its secret creds.
 *   2. Browser PUTs the file bytes directly to the object store. Bytes
 *      never touch our API — keeps server memory + bandwidth free.
 *   3. Caller persists the returned fileUrl into its domain table
 *      (e.g. POST /documents) — Step 3 happens in the consuming page,
 *      not here.
 *
 * Why PUT (not presigned-POST): E2E Networks blocks bucket-level CORS
 * config via the S3 API, so we can't get multipart preflight to pass.
 * A pre-signed PUT with a single `Content-Type` header is a simple
 * request and goes through without a preflight in current browsers.
 *
 * Why XHR (not fetch): QA #261 — `fetch()` doesn't surface upload
 * progress events. XMLHttpRequest exposes `upload.onprogress` so the
 * caller can render a progress bar. The onProgress callback is fired
 * 0..100 (clamped); callers store the value in component state and
 * pass it to <UploadProgress />.
 *
 * Returns the public fileUrl — the caller persists this on its own
 * domain record.
 */
export interface UploadFileInput {
  file: File;
  onProgress?: (percent: number) => void;
}

function putFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream',
    );

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable && e.total > 0) {
        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
        return;
      }
      const body = (xhr.responseText ?? '').slice(0, 300);
      reject(
        new Error(
          `Upload failed (${xhr.status}): ${body || xhr.statusText || 'unknown error'}`,
        ),
      );
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed: network error'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload aborted'));
    };

    xhr.send(file);
  });
}

/**
 * QA #258 — fetch a presigned-GET URL the browser can open in a new
 * tab. With `disposition: 'inline'` the object store responds with
 * `Content-Disposition: inline`, so PDFs/images render in the browser
 * instead of triggering a download. Returns the signed URL string for
 * `window.open(...)`.
 */
export async function fetchPresignedDownloadUrl(input: {
  fileUrl: string;
  disposition?: 'inline' | 'attachment';
  fileName?: string;
}): Promise<string> {
  const response = await api.post<{
    data: { downloadUrl: string };
  }>('/upload/download-url', {
    file_url: input.fileUrl,
    disposition: input.disposition,
    file_name: input.fileName,
  });
  return response.data.downloadUrl;
}

export function useUploadFileToS3() {
  return useMutation({
    mutationFn: async function uploadFile(
      input: UploadFileInput,
    ): Promise<{ fileUrl: string; key: string }> {
      // Step 1 — request the permission slip.
      const presign = await api.post<{
        data: { uploadUrl: string; fileUrl: string; key: string };
      }>('/upload/presigned-url', {
        fileName: input.file.name,
        contentType: input.file.type || 'application/octet-stream',
      });
      const { uploadUrl, fileUrl, key } = presign.data;

      // Step 2 — ship the bytes straight to the object store via XHR
      // so the caller can render an upload-progress UI. Do NOT attach
      // Authorization here; the signature is in the URL query string.
      // Content-Type must match what was signed.
      await putFileWithProgress(uploadUrl, input.file, input.onProgress);

      return { fileUrl, key };
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateDocument(params: {
      id: string;
      data: UpdateDocumentInput;
    }) {
      return api.patch<{ data: SocietyDocument }>(
        `/documents/${params.id}`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deleteDocument(id: string) {
      return api.delete<{ message: string }>(`/documents/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
