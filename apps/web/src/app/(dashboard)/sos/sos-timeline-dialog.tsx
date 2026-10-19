'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAcknowledgeSos, useResolveSos, useSosDetail, type SosAlert } from '@/hooks/use-sos';
import { friendlyError } from '@/lib/api-error';

interface SosTimelineDialogProps {
  /** The alert to show; '' = closed. */
  id: string;
  onClose: () => void;
  /** Acknowledge / Resolve / False alarm inside the dialog (Panic Alerts table, GATE-11). */
  withActions?: boolean;
}

function AlertActions({ alert }: { alert: SosAlert }): ReactNode {
  const { addToast } = useToast();
  const acknowledge = useAcknowledgeSos();
  const resolve = useResolveSos();
  const busy = acknowledge.isPending || resolve.isPending;
  const failed = (title: string) => (error: unknown) =>
    addToast({ title, description: friendlyError(error), variant: 'destructive' });
  const settle = (status: 'resolved' | 'false_alarm') =>
    resolve.mutate(
      { id: alert.id, status },
      {
        onSuccess: () => addToast({ title: status === 'resolved' ? 'Resolved' : 'Marked false alarm', variant: 'success' }),
        onError: failed('Action failed'),
      },
    );

  if (alert.status !== 'active' && alert.status !== 'acknowledged') return null;
  return (
    <DialogFooter className="mt-4 gap-2">
      {alert.status === 'active' && (
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            acknowledge.mutate(alert.id, {
              onSuccess: () => addToast({ title: 'Acknowledged', variant: 'success' }),
              onError: failed('Could not acknowledge'),
            })
          }
        >
          Acknowledge
        </Button>
      )}
      <Button type="button" variant="outline" disabled={busy} onClick={() => settle('resolved')}>
        Resolve
      </Button>
      <Button type="button" variant="outline" disabled={busy} onClick={() => settle('false_alarm')}>
        False alarm
      </Button>
    </DialogFooter>
  );
}

/** An alert's incident timeline (the SOS console's, shared with the Panic Alerts table). */
export function SosTimelineDialog({ id, onClose, withActions = false }: SosTimelineDialogProps): ReactNode {
  const { data, isLoading } = useSosDetail(id);
  return (
    <Dialog open={id !== ''} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Incident timeline</DialogTitle>
          <DialogDescription>
            {data?.alert ? `${data.alert.category.toUpperCase()} · ${data.alert.status}` : 'Loading…'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ol className="space-y-3">
            {(data?.events ?? []).map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-medium">{event.event_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.actor_name ? `${event.actor_name} · ` : ''}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {withActions && data?.alert && <AlertActions alert={data.alert} />}
      </DialogContent>
    </Dialog>
  );
}
