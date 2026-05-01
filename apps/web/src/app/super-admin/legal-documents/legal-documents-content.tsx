'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { type ReactNode } from 'react';
import type { CmsAppTarget, CmsPageType } from '@/hooks';
import { LegalPageCard } from './legal-page-card';

// QA Round 14 #14-2a — Super Admin → Legal Documents page.
//
// 3×2 grid: (Resident, Guard, Admin) × (T&C, Privacy). Each card is a
// fully self-contained editor backed by useCmsPage / useUpdateCmsPage.
// Append-only versioning; super_admin only (backend RBAC enforces, the
// route lives under /super-admin/* which the existing layout
// bootstraps).

const APP_TARGETS: CmsAppTarget[] = ['resident', 'guard', 'admin'];
const PAGE_TYPES: CmsPageType[] = ['terms_and_conditions', 'privacy_policy'];

export default function LegalDocumentsContent(): ReactNode {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/super-admin"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Super Admin
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="h-6 w-6 text-primary" />
            Legal Documents
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Manage Terms &amp; Conditions and Privacy Policy for the
            Resident, Guard, and Admin apps. Each save creates a new
            version — old versions are kept for audit. Changes go live
            on the apps&rsquo; next fetch (and immediately on the
            public /legal/terms + /legal/privacy routes for the Admin
            flavour).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/legal/terms"
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Preview /legal/terms ↗
          </Link>
          <Link
            href="/legal/privacy"
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Preview /legal/privacy ↗
          </Link>
        </div>
      </div>

      {/* 3×2 grid of editor cards. On lg+ shows 2 columns
          (T&C / Privacy) × 3 rows (Resident / Guard / Admin); on
          md collapses to 2 columns × 3 rows; on sm stacks. */}
      <div className="grid gap-6 lg:grid-cols-2">
        {APP_TARGETS.flatMap((app) =>
          PAGE_TYPES.map((type) => (
            <LegalPageCard key={`${app}-${type}`} app={app} type={type} />
          )),
        )}
      </div>
    </div>
  );
}
