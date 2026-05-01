'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, History, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import {
  useCmsPage,
  useCmsPageHistory,
  useUpdateCmsPage,
  type CmsAppTarget,
  type CmsPage,
  type CmsPageType,
} from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

// QA Round 14 #14-2a — single card in the 3×2 Legal Documents grid.
//
// Fetches the latest published row for (app, type) on mount, hydrates
// title + markdown body into local form state, and writes back via
// useUpdateCmsPage (POST + PATCH-publish in one mutation). Append-only
// versioning is enforced server-side; from the admin's POV this is
// just "edit the doc and click Save & Publish."
//
// The preview pane renders the markdown via react-markdown with the
// same component the public /legal/* routes use, so what you see here
// matches what residents/guards/admins see in their apps.

function appLabel(app: CmsAppTarget): string {
  switch (app) {
    case 'admin':
      return 'Admin';
    case 'resident':
      return 'Resident';
    case 'guard':
      return 'Guard';
  }
}

function typeLabel(type: CmsPageType): string {
  return type === 'terms_and_conditions'
    ? 'Terms & Conditions'
    : 'Privacy Policy';
}

interface LegalPageCardProps {
  app: CmsAppTarget;
  type: CmsPageType;
}

export function LegalPageCard({ app, type }: LegalPageCardProps): ReactNode {
  const { addToast } = useToast();
  const pageQuery = useCmsPage(app, type);
  const updateMutation = useUpdateCmsPage();
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyQuery = useCmsPageHistory(app, type);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Hydrate local form state from the latest-published row whenever
  // the query lands. `pageQuery.data === null` means "nothing
  // published yet" — leave the inputs empty so the super-admin can
  // write the first version.
  useEffect(() => {
    if (pageQuery.data === undefined) return;
    const data = pageQuery.data;
    if (data === null) {
      setTitle('');
      setBody('');
      return;
    }
    setTitle(data.title);
    setBody(data.body_markdown);
  }, [pageQuery.data]);

  const dirty =
    pageQuery.data === null
      ? title.trim().length > 0 || body.trim().length > 0
      : pageQuery.data
        ? title !== pageQuery.data.title || body !== pageQuery.data.body_markdown
        : false;

  function handleSave(): void {
    if (!title.trim()) {
      addToast({
        title: 'Title required',
        description: 'Add a title before publishing.',
        variant: 'destructive',
      });
      return;
    }
    if (!body.trim()) {
      addToast({
        title: 'Body required',
        description: 'The document body cannot be empty.',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate(
      {
        app_target: app,
        page_type: type,
        title: title.trim(),
        body_markdown: body,
      },
      {
        onSuccess(row) {
          addToast({
            title: `${appLabel(app)} ${typeLabel(type)} published`,
            description: `Version ${row.version} is now live across the ${appLabel(app)} app.`,
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to publish',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>
              {appLabel(app)} · {typeLabel(type)}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Renders on the {appLabel(app)} app&rsquo;s{' '}
              {type === 'terms_and_conditions' ? 'Terms' : 'Privacy'}{' '}
              screen + public /legal/{type === 'terms_and_conditions' ? 'terms' : 'privacy'} (admin flavour only).
            </p>
          </div>
          <PublishedChip page={pageQuery.data} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {pageQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor={`title-${app}-${type}`}>Title</Label>
              <Input
                id={`title-${app}-${type}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${appLabel(app)} ${typeLabel(type)}`}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor={`body-${app}-${type}`}>Body (Markdown)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? 'Hide preview' : 'Preview'}
                </Button>
              </div>
              <div
                className={
                  showPreview
                    ? 'grid grid-cols-1 gap-3 lg:grid-cols-2'
                    : 'grid grid-cols-1 gap-3'
                }
              >
                <Textarea
                  id={`body-${app}-${type}`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                  placeholder="# Heading&#10;&#10;Body markdown…"
                />
                {showPreview && (
                  <div className="prose prose-sm max-w-none rounded-md border bg-muted/30 p-3 dark:prose-invert">
                    {body.trim() ? (
                      <ReactMarkdown>{body}</ReactMarkdown>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        Preview shows up here.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen((v) => !v)}
              >
                <History className="mr-1.5 h-4 w-4" />
                {historyOpen ? 'Hide prior versions' : 'View prior versions'}
                {historyOpen ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || !dirty}
              >
                <Save className="mr-1.5 h-4 w-4" />
                {updateMutation.isPending ? 'Publishing…' : 'Save & Publish'}
              </Button>
            </div>
            {historyOpen ? (
              <>
                <Separator />
                <HistoryList
                  loading={historyQuery.isLoading}
                  rows={historyQuery.data ?? []}
                />
              </>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PublishedChip({ page }: { page: CmsPage | null | undefined }): ReactNode {
  if (page === undefined) {
    return <Skeleton className="h-5 w-32" />;
  }
  if (page === null) {
    return (
      <Badge variant="warning" className="whitespace-nowrap">
        Not published yet
      </Badge>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <Badge variant="success" className="whitespace-nowrap">
        v{page.version}
      </Badge>
      <p className="text-xs text-muted-foreground">
        Published {formatDate(page.published_at ?? page.updated_at)}
      </p>
    </div>
  );
}

function HistoryList({
  loading,
  rows,
}: {
  loading: boolean;
  rows: CmsPage[];
}): ReactNode {
  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }
  if (rows.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No prior versions yet.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5 text-xs">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-1.5"
        >
          <span className="font-medium">v{row.version}</span>
          <span className="text-muted-foreground">
            {row.published_at ? (
              <>Published {formatDate(row.published_at)}</>
            ) : (
              <em>Draft</em>
            )}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {row.published_by ? row.published_by.slice(0, 8) : '—'}
          </span>
        </li>
      ))}
    </ul>
  );
}
