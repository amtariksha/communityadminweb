'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  isMeetingRouteMissing,
  useMeetingNoticeSettings,
  useSaveMeetingNoticeSettings,
  type MeetingNoticeSettings,
} from '@/hooks/use-meeting-invites';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';

// PUT /meetings/settings: the community admin's (and a super admin's).
const SAVE_ROLES = new Set(['super_admin', 'community_admin']);

const SWITCHES: ReadonlyArray<{ key: keyof MeetingNoticeSettings; label: string; hint: string }> = [
  {
    key: 'invitations_enabled',
    label: 'Send meeting invitations',
    hint: 'Invite on a meeting tells its invitees and audience in the app, by push and by e-mail; cancelling a meeting tells them too.',
  },
  {
    key: 'reminders_enabled',
    label: 'Send meeting reminders',
    hint: 'The hour / day / week before ticks on a meeting send a reminder to the people invited.',
  },
];

/**
 * Projects & Meetings › SetUp › Meeting notifications (PROJ-42, PROJ-43):
 * nothing is sent to anyone until a community admin switches it on here.
 */
export function MeetingNotificationsCard(): ReactNode {
  const { addToast } = useToast();
  const query = useMeetingNoticeSettings();
  const save = useSaveMeetingNoticeSettings();
  const [draft, setDraft] = useState<MeetingNoticeSettings | null>(null);
  const canSave = SAVE_ROLES.has(currentRole() ?? '');
  useEffect(() => {
    if (query.data) setDraft(query.data);
  }, [query.data]);

  async function submit(): Promise<void> {
    if (!draft) return;
    try {
      await save.mutateAsync(draft);
      addToast({ title: 'Meeting notifications saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' });
    }
  }

  function body(): ReactNode {
    if (isMeetingRouteMissing(query.error)) return <p className="text-sm text-muted-foreground">Meeting notifications are not available yet.</p>;
    if (query.error) return <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
    if (!draft) return <Skeleton className="h-16 w-full" />;
    return (
      <div className="space-y-3 text-sm">
        {SWITCHES.map((item) => (
          <label key={item.key} className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={draft[item.key]} disabled={!canSave} onChange={(e) => setDraft({ ...draft, [item.key]: e.target.checked })} />
            <span>
              <span className="font-medium">{item.label}</span>
              <span className="block text-xs text-muted-foreground">{item.hint}</span>
            </span>
          </label>
        ))}
        <p className="text-xs text-muted-foreground">SMS is not sent until the SMS channel is set up.</p>
        {canSave ? (
          <Button type="button" size="sm" disabled={save.isPending} onClick={() => void submit()}>
            Save Changes
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Only a community admin can change these.</p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting notifications</CardTitle>
      </CardHeader>
      <CardContent>{body()}</CardContent>
    </Card>
  );
}
