'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/api-error';
import { useCreateAnnouncement } from '@/hooks/use-announcements';
import type { AssistantDraftCard } from '@/hooks/use-assistant';

/**
 * A notice the Assistant proposed. Only the person's own press saves it,
 * as a Draft through POST /announcements (never posted: posting it is done
 * on the Announcements screen, through the approval gate).
 */
export function DraftProposal({ card }: { card: AssistantDraftCard }): ReactNode {
  const create = useCreateAnnouncement();
  const saved = create.data?.data;
  return (
    <div className="mt-2 space-y-1 rounded-md border bg-background p-2 text-xs">
      <p className="font-medium">{card.title}</p>
      <p className="whitespace-pre-wrap text-muted-foreground">{card.body}</p>
      {saved ? (
        <p>
          Saved as a draft, not posted.{' '}
          <Link href={`/announcements/${encodeURIComponent(saved.id)}`} className="font-medium text-primary hover:underline">
            Open the draft
          </Link>
        </p>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={create.isPending}
          onClick={() => create.mutate({ title: card.title, body: card.body, category: card.category, classification: 'official' })}
        >
          {create.isPending ? 'Saving…' : 'Save as draft'}
        </Button>
      )}
      {create.isError && (
        <p role="alert" className="text-destructive">
          {friendlyError(create.error)}
        </p>
      )}
    </div>
  );
}
