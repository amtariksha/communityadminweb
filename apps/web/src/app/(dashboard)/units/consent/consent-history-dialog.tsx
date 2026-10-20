'use client';

import { type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CONSENT_CATEGORIES, consentLabel, SOURCE_LABELS, useConsentHistory } from '@/hooks/use-consents';
import { formatDate } from '@/lib/utils';

const CATEGORY_LABELS = Object.fromEntries(CONSENT_CATEGORIES.map((category) => [category.key, category.label]));

/** View Logs (UNIT-S17): one person's consent changes — Category · Old → New · Changed On · Source. */
export function ConsentHistoryDialog({ userId, onClose }: { userId: string | null; onClose: () => void }): ReactNode {
  const history = useConsentHistory(userId);
  const changes = history.data?.data ?? [];
  return (
    <Dialog open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consent log{history.data?.name ? ` — ${history.data.name}` : ''}</DialogTitle>
          <DialogDescription>Every change this person made, newest first. Nothing is ever deleted.</DialogDescription>
        </DialogHeader>
        {history.isLoading && <Skeleton className="h-24 w-full" />}
        {history.isError && <p className="text-sm text-destructive">The log could not be loaded.</p>}
        {history.data && changes.length === 0 && <p className="text-sm text-muted-foreground">No changes recorded.</p>}
        {changes.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-2 font-medium">Category</th>
                <th className="py-1 pr-2 font-medium">Old → New</th>
                <th className="py-1 pr-2 font-medium">Changed On</th>
                <th className="py-1 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.id} className="border-b last:border-b-0">
                  <td className="py-1 pr-2">{CATEGORY_LABELS[change.category] ?? change.category}</td>
                  <td className="py-1 pr-2">{`${consentLabel(change.old_value)} → ${consentLabel(change.new_value)}`}</td>
                  <td className="py-1 pr-2 whitespace-nowrap">{formatDate(change.changed_at)}</td>
                  <td className="py-1">{SOURCE_LABELS[change.source] ?? change.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}
