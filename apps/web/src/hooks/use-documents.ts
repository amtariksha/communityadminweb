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
  file_type: string;
  file_size: number;
  access_level?: string;
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
