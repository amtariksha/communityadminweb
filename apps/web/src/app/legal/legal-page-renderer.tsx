'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useCmsPage, type CmsPageType } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

// QA Round 14 #14-2c — shared renderer for the public /legal/terms +
// /legal/privacy routes. Reads the **admin** flavour of the
// requested document (the resident/guard apps have their own bundled
// markdown + their own /legal screens; this site is admin-facing, so
// admin is the right flavour to surface here).
//
// Backend endpoint is @Public() so this works without an auth token.
// Falls back to a friendly empty state when nothing has been
// published yet (super-admin hasn't filled in the doc).

interface LegalPageRendererProps {
  type: CmsPageType;
}

export function LegalPageRenderer({ type }: LegalPageRendererProps): ReactNode {
  const pageQuery = useCmsPage('admin', type);

  return (
    <article className="space-y-6">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>

      {pageQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : pageQuery.data ? (
        <>
          <header className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight">
              {pageQuery.data.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Version {pageQuery.data.version} · last updated{' '}
              {formatDate(
                pageQuery.data.published_at ?? pageQuery.data.updated_at,
              )}
            </p>
          </header>
          <div className="prose prose-sm max-w-none dark:prose-invert sm:prose-base">
            <ReactMarkdown>{pageQuery.data.body_markdown}</ReactMarkdown>
          </div>
        </>
      ) : (
        <div className="rounded-md border bg-muted/30 p-6 text-center">
          <h2 className="text-lg font-semibold">
            {type === 'terms_and_conditions'
              ? 'Terms & Conditions'
              : 'Privacy Policy'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This document is being drafted and will appear here once
            published. Contact{' '}
            <a href="mailto:support@eassy.life" className="underline">
              support@eassy.life
            </a>{' '}
            for the current text.
          </p>
        </div>
      )}
    </article>
  );
}
