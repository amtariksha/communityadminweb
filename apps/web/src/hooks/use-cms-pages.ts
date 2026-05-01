'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

// QA Round 14 #14-2b — admin web hooks for the legal-document CMS.
//
// Backend (shipped at f12cf5b, QA #14-1a/b/c) exposes:
//   GET   /cms/pages?app=&type=         — public (no auth header needed),
//                                          returns latest published row.
//   GET   /cms/pages/admin?app=&type=   — super_admin, returns full
//                                          version history (latest first).
//   POST  /cms/pages                    — super_admin, creates a new draft
//                                          row with version=MAX+1.
//   PATCH /cms/pages/:id                — super_admin, partial save with
//                                          optional `publish` flag.
//   PATCH /cms/pages/:id/publish        — super_admin, stamps published_at
//                                          + published_by.
//
// `useUpdateCmsPage` combines POST + PATCH-publish so the Legal Documents
// editor's single "Save & Publish" button does both in one action.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CmsAppTarget = 'admin' | 'resident' | 'guard';
export type CmsPageType = 'terms_and_conditions' | 'privacy_policy';

/**
 * Wire shape of a `cms_pages` row. `published_at` / `published_by` are
 * null on draft rows. Timestamps come back as ISO strings (the shared
 * api wrapper does not auto-parse Date columns).
 */
export interface CmsPage {
  id: string;
  app_target: CmsAppTarget;
  page_type: CmsPageType;
  title: string;
  body_markdown: string;
  version: number;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveCmsPageInput {
  app_target: CmsAppTarget;
  page_type: CmsPageType;
  title: string;
  body_markdown: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const cmsPageKeys = {
  all: ['cms-pages'] as const,
  latest: (app: CmsAppTarget, type: CmsPageType) =>
    [...cmsPageKeys.all, 'latest', app, type] as const,
  history: (app: CmsAppTarget, type: CmsPageType) =>
    [...cmsPageKeys.all, 'history', app, type] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Public read of the latest published row for (app, type). Used by:
 *   - Super Admin → Legal Documents page (current published view).
 *   - Public /legal/terms + /legal/privacy routes (admin flavour).
 *   - Login footer link target.
 *
 * The endpoint is `@Public()` on the backend — no token required. The
 * shared api wrapper still attaches the Authorization header when one
 * is in memory; the backend ignores it on this route.
 *
 * Returns `null` instead of throwing when nothing has been published
 * yet (backend 404), so the consuming UI can show a "no content yet"
 * empty state without a try/catch.
 */
export function useCmsPage(app: CmsAppTarget, type: CmsPageType) {
  return useQuery({
    queryKey: cmsPageKeys.latest(app, type),
    queryFn: async () => {
      try {
        const res = await api.get<{ data: CmsPage }>('/cms/pages', {
          params: { app, type },
        });
        return res.data;
      } catch (err) {
        // Treat 404 as "no published version yet" — return null so
        // useQuery resolves successfully with empty data instead of
        // bubbling an error toast.
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    // Cache aggressively — legal docs change at human-edit cadence.
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Super-admin only — full version history for (app, type), latest
 * first. Used by the "View prior versions" expand on the Legal
 * Documents page. Not gated client-side here; backend RBAC rejects
 * non-super-admin callers with 403.
 */
export function useCmsPageHistory(app: CmsAppTarget, type: CmsPageType) {
  return useQuery({
    queryKey: cmsPageKeys.history(app, type),
    queryFn: async () => {
      const res = await api.get<{ data: CmsPage[] }>('/cms/pages/admin', {
        params: { app, type },
      });
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * "Save & Publish" — creates a new row via `POST /cms/pages` then
 * stamps it as published via `PATCH /cms/pages/:id/publish`. Both
 * hops happen inside the mutation so the UI's single button maps to
 * a single observable mutation state.
 *
 * The backend's append-only versioning means every save creates a
 * new row (version = MAX(version)+1). Old rows stay around for the
 * version-history view; rollback is "publish a prior version", not
 * destructive edit.
 *
 * Invalidates BOTH the latest-published query (so the editor's
 * timestamp + author chip refresh) and the history list (so the
 * new row shows up at the top of "View prior versions").
 */
export function useUpdateCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveCmsPageInput): Promise<CmsPage> => {
      // Step 1 — create the new draft row at version=MAX+1.
      const created = await api.post<{ data: CmsPage }>('/cms/pages', input);
      // Step 2 — flip published_at + published_by to make it live.
      const published = await api.patch<{ data: CmsPage }>(
        `/cms/pages/${created.data.id}/publish`,
      );
      return published.data;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({
        queryKey: cmsPageKeys.latest(row.app_target, row.page_type),
      });
      qc.invalidateQueries({
        queryKey: cmsPageKeys.history(row.app_target, row.page_type),
      });
    },
  });
}
