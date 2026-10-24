'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unitPanelKeys } from './use-unit-panel';
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
  unit_id?: string;
  folder_type?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateCategoryInput {
  name: string;
  /** FILE-20 — the root the folder belongs to; null or absent = both. */
  root?: 'admin' | 'residents' | null;
}

/** FILE-20 — a society folder's rename, root (null = both) and retire / re-activate. */
export interface UpdateFolderInput {
  name?: string;
  root?: 'admin' | 'residents' | null;
  is_active?: boolean;
}

/** Which folders a picker lists: those of a root (or both); active only. */
export interface FolderListFilters {
  root?: 'admin' | 'residents';
}

// QA #238 — audience targeting. NULL on either axis means
// "no restriction on that axis" (admins see all; residents see
// matching rows). Allowed roles match migration 065's CHECK.
export type DocumentAudienceRole =
  | 'owner'
  | 'tenant_resident'
  | 'committee_member';

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
  audience_role?: DocumentAudienceRole | null;
  audience_unit_id?: string | null;
  unit_id?: string | null;
  folder_type?: 'common' | 'unit' | 'committee';
  /** PROF-42: sent only when ticked; an API without it ignores the key. */
  is_public?: boolean;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string | null;
  category_id?: string;
  access_level?: string;
  audience_role?: DocumentAudienceRole | null;
  audience_unit_id?: string | null;
  unit_id?: string | null;
  folder_type?: 'common' | 'unit' | 'committee';
  /** YYYY-MM-DD; null clears it. */
  expiry_date?: string | null;
  // A replaced file becomes the next version (FILE-11).
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  change_notes?: string;
  /** PROF-42: offered on the society's public files page. */
  is_public?: boolean;
}

/** A row of GET /documents/expiring: the document plus its days to expiry. */
export type ExpiringDocument = SocietyDocument & {
  expiry_date: string;
  days_left: number;
};

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
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.folder_type && filters.folder_type !== 'all') params.folder_type = filters.folder_type;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Category queries
// ---------------------------------------------------------------------------

export function useDocumentCategories(filters: FolderListFilters = {}) {
  return useQuery({
    queryKey: [...documentKeys.categories(), 'list', filters.root ?? 'all'] as const,
    queryFn: function fetchDocumentCategories() {
      return api
        .get<{ data: DocumentCategory[] }>('/documents/categories', filters.root ? { params: { root: filters.root } } : undefined)
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

/** FILE-20 — rename, move to a root or retire / re-activate a society folder. */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateFolder({ id, ...input }: UpdateFolderInput & { id: string }) {
      return api.patch<{ data: DocumentCategory }>(`/documents/categories/${id}`, input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: documentKeys.categories() });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
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
        .get<{ data: ExpiringDocument[] }>('/documents/expiring', {
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
    onSuccess: function invalidate(_data, input) {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      // The unit panel lists the unit's documents (Upload from its Documents section).
      if (input.unit_id) queryClient.invalidateQueries({ queryKey: unitPanelKeys.panel(input.unit_id) });
    },
  });
}

/**
 * Three-step direct-to-object-store upload (Mera Ghar pattern).
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
  // Super-admin uploads (e.g. a society's white-label logo) act on a tenant
  // the super-admin has no global "current tenant" for, so the api client
  // can't auto-attach x-tenant-id. Pass it explicitly — the backend's upload
  // guard requires it for super-admins (403 "must provide x-tenant-id"
  // otherwise). Normal tenant users omit this; the api client supplies the
  // header from the selected tenant automatically.
  tenantId?: string;
  // What the upload is for (POST /upload/presigned-url `purpose`), e.g.
  // journal_entry; a route that keeps the key may insist on it.
  purpose?: string;
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

export function useUploadFileToS3() {
  return useMutation({
    mutationFn: async function uploadFile(
      input: UploadFileInput,
    ): Promise<{ fileUrl: string; key: string }> {
      // Step 1 — request the permission slip.
      const presign = await api.post<{
        data: { uploadUrl: string; fileUrl: string; key: string };
      }>(
        '/upload/presigned-url',
        {
          fileName: input.file.name,
          contentType: input.file.type || 'application/octet-stream',
          ...(input.purpose ? { purpose: input.purpose } : {}),
        },
        input.tenantId
          ? { headers: { 'x-tenant-id': input.tenantId } }
          : undefined,
      );
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
