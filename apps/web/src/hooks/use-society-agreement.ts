'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** PROF-40 — the society's own user agreement (GET /society-agreement/versions). */
export type AgreementStatus = 'draft' | 'published';

export interface AgreementVersion {
  id: string;
  version: number;
  body_html: string;
  status: AgreementStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementVersionSummary {
  id: string;
  version: number;
  status: AgreementStatus;
  published_at: string | null;
  acceptances: number;
}

export interface AgreementVersions {
  versions: AgreementVersionSummary[];
  /** What the editor opens: the open draft, else the current published version. */
  editable: AgreementVersion;
  current: AgreementVersion | null;
  enabled: boolean;
}

/** "N of M residents have accepted" the current version. */
export interface AgreementStats {
  agreement_id: string | null;
  version: number | null;
  published_at: string | null;
  accepted: number;
  residents: number;
  enabled: boolean;
}

export const agreementKeys = {
  all: ['society-agreement'] as const,
  versions: ['society-agreement', 'versions'] as const,
  stats: ['society-agreement', 'stats'] as const,
};

export function useAgreementVersions() {
  return useQuery({
    queryKey: agreementKeys.versions,
    queryFn: function fetchAgreementVersions() {
      return api.get<{ data: AgreementVersions }>('/society-agreement/versions').then((res) => res.data);
    },
    retry: false,
  });
}

export function useAgreementStats() {
  return useQuery({
    queryKey: agreementKeys.stats,
    queryFn: function fetchAgreementStats() {
      return api.get<{ data: AgreementStats }>('/society-agreement/acceptance-stats').then((res) => res.data);
    },
    retry: false,
  });
}

/** Save: into the open draft, or a new draft version once the newest is published. */
export function useSaveAgreementDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveAgreementDraft(bodyHtml: string) {
      return api.post<{ data: AgreementVersion }>('/society-agreement/draft', { body_html: bodyHtml }).then((res) => res.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agreementKeys.all }),
  });
}

/**
 * Publish: the draft becomes the current agreement; residents are asked
 * again. Names the draft as last read (`updated_at`): a draft changed since
 * answers 409 agreement_changed.
 */
export function usePublishAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function publishAgreement(draft: Pick<AgreementVersion, 'id' | 'updated_at'>) {
      return api
        .post<{ data: AgreementVersion }>(`/society-agreement/${draft.id}/publish`, { updated_at: draft.updated_at })
        .then((res) => res.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agreementKeys.all }),
  });
}
