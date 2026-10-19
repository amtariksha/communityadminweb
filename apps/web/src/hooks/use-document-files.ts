'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DocumentAudienceRole } from './use-documents';
import { documentKeys } from './use-documents';

/** Admin Files › Common Files roots (FILE-10). */
export type DocumentRoot = 'admin' | 'residents';

/** A row of GET /documents as Admin Files shows it. */
export interface DocumentFile {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_by_name?: string | null;
  audience_role: DocumentAudienceRole | null;
  audience_unit_id: string | null;
  unit_id?: string | null;
  unit_number?: string | null;
  folder_type?: 'common' | 'unit' | 'committee' | null;
  expiry_date?: string | null;
  created_at: string;
}

export interface DocumentFileVersion {
  id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  file_size: number;
  change_notes: string | null;
  uploaded_by_name?: string | null;
  created_at: string;
}

/** A folder of one root with its number of files. */
export interface DocumentFolder {
  id: string;
  name: string;
  is_system: boolean;
  file_count: number;
}

/** A row of the Unit Specific Files roster (FILE-12). */
export interface UnitFileSummaryRow {
  unit_id: string;
  unit_number: string;
  block: string | null;
  name: string | null;
  files: number;
}

export interface UnitFileSummary {
  data: UnitFileSummaryRow[];
  total: number;
  total_files: number;
}

export interface UnitFileSummaryFilters {
  block?: string | null;
  q?: string;
  page: number;
  limit: number;
}

export const documentFileKeys = {
  folders: (root: DocumentRoot) => [...documentKeys.categories(), 'counts', root] as const,
  unitSummary: (filters: UnitFileSummaryFilters) => [...documentKeys.all, 'unit-summary', filters] as const,
};

/** The folders of a root with their file counts (FILE-10). */
export function useDocumentFolders(root: DocumentRoot) {
  return useQuery({
    queryKey: documentFileKeys.folders(root),
    queryFn: () =>
      api
        .get<{ data: DocumentFolder[] }>('/documents/categories', { params: { root, with_counts: 'true' } })
        .then((res) => res.data),
  });
}

/** One document with every version, newest first (FILE-11). */
export function useDocumentWithVersions(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () =>
      api
        .get<{ data: { document: DocumentFile; versions: DocumentFileVersion[] } }>(`/documents/${id}`)
        .then((res) => res.data),
    enabled: id !== '',
  });
}

export function unitSummaryParams(filters: UnitFileSummaryFilters): Record<string, string> {
  const params: Record<string, string> = { page: String(filters.page), limit: String(filters.limit) };
  if (filters.block) params.block = filters.block;
  if (filters.q) params.q = filters.q;
  return params;
}

/** Every unit with its number of files (FILE-12). */
export function useUnitFileSummary(filters: UnitFileSummaryFilters) {
  return useQuery({
    queryKey: documentFileKeys.unitSummary(filters),
    queryFn: () => api.get<UnitFileSummary>('/documents/unit-summary', { params: unitSummaryParams(filters) }),
    placeholderData: keepPreviousData,
  });
}
