'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { isMeetingRouteMissing, useMeetingNoticeSettings, useSendInvitations } from '@/hooks/use-meeting-invites';
import { useMeeting, type MeetingItem } from '@/hooks/use-meetings';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';
import { AUDIENCES } from './meeting-fields';

/** "Invited n people" / "Everyone has already been invited". */
export function invitedMessage(invited: number): string {
  if (invited === 0) return 'Everyone has already been invited.';
  return `Invited ${invited} ${invited === 1 ? 'person' : 'people'}.`;
}

function Body({ meetingId, off }: { meetingId: string; off: boolean }): ReactNode {
  const detail = useMeeting(meetingId);
  if (!detail.data) return <Skeleton className="h-24 w-full" />;
  const audience = AUDIENCES.find((choice) => choice.value === (detail.data.audience ?? 'committee_staff'))?.label;
  const named = (detail.data.invitees ?? []).filter((row) => row.source === 'named');
  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="font-medium">Attendees:</span> {audience}
      </p>
      <div>
        <p className="font-medium">Named invitees</p>
        {named.length === 0 ? (
          <p className="text-muted-foreground">No one is named; pick people on the meeting form.</p>
        ) : (
          <ul className="list-disc pl-5">
            {named.map((row) => (
              <li key={row.user_id}>
                {row.name ?? 'Unnamed'} — {row.invited_at ? 'invited' : 'not invited yet'}
              </li>
            ))}
          </ul>
        )}
      </div>
      {off && (
        <p role="alert" className="text-muted-foreground">
          Meeting invitations are switched off. A community admin can switch them on in Projects &amp; Meetings › SetUp.
        </p>
      )}
    </div>
  );
}

/**
 * Invite (PROJ-S10): the audience and the named invitees, and Send
 * Invitations — in-app, push and e-mail once to each person; sending again
 * reaches only people added since.
 */
export function InviteDialog({ meeting, onClose }: { meeting: MeetingItem; onClose: () => void }): ReactNode {
  const { addToast } = useToast();
  const settings = useMeetingNoticeSettings();
  const send = useSendInvitations();
  const missing = isMeetingRouteMissing(settings.error);
  const off = settings.data ? !settings.data.invitations_enabled : false;

  async function invite(): Promise<void> {
    try {
      const result = await send.mutateAsync(meeting.id);
      addToast({ title: invitedMessage(result.invited), variant: 'success' });
      onClose();
    } catch (error) {
      addToast({ title: 'Could not send the invitations', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite</DialogTitle>
          <DialogDescription>
            {meeting.title} · {formatDate(meeting.meeting_date)} {meeting.start_time.slice(0, 5)}
          </DialogDescription>
        </DialogHeader>
        {missing ? <p className="text-sm text-muted-foreground">Invitations are not available yet.</p> : <Body meetingId={meeting.id} off={off} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" disabled={missing || off || !settings.data || send.isPending} onClick={() => void invite()}>
            Send Invitations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
