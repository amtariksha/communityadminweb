'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

export interface NoticePreviewValues {
  title: string;
  body: string;
  expiresAt?: string | null;
  attachmentNames: readonly string[];
}

/** The notice as a resident sees it in the app (ANN-11 Preview); nothing is saved. */
export function NoticeCard({ notice }: { notice: NoticePreviewValues }): ReactNode {
  return (
    <article className="space-y-2 rounded-lg border p-4" aria-label="Resident view">
      <h3 className="text-base font-semibold">{notice.title || 'Untitled announcement'}</h3>
      <p className="whitespace-pre-wrap text-sm">{notice.body}</p>
      {notice.attachmentNames.length > 0 && (
        <ul className="space-y-1 text-sm text-primary">
          {notice.attachmentNames.map((name) => (
            <li key={name}>📎 {name}</li>
          ))}
        </ul>
      )}
      {notice.expiresAt && <p className="text-xs text-muted-foreground">Until {formatDate(notice.expiresAt)}</p>}
    </article>
  );
}

export function NoticePreviewDialog(props: { open: boolean; onClose: () => void; notice: NoticePreviewValues }): ReactNode {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>
        <NoticeCard notice={props.notice} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Close preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
