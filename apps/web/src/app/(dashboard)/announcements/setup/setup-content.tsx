'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ApproverGridEditor } from '@/components/approver-grid';
import { PageHeader } from '@/components/layout/page-header';
import { currentMenuRole } from '@/components/layout/classic/use-classic-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useAnnouncementChannels,
  useAnnouncementRights,
  useNotificationChannels,
  useSaveAnnouncementChannels,
  useSaveAnnouncementRights,
  type AnnouncementChannel,
} from '@/hooks';
import { useApproverGrid } from '@/hooks/use-approver-grid';
import { friendlyError } from '@/lib/api-error';
import { useAdminLayout } from '@/lib/layout-context';
import { RightsGrid } from './rights-grid';

const EDITOR_ROLES = new Set(['super_admin', 'community_admin']);

function DefaultChannels(props: {
  email: boolean;
  sms: boolean;
  smsAvailable: boolean;
  canEdit: boolean;
  onChange: (patch: { email?: boolean; sms?: boolean }) => void;
}): ReactNode {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">How an announcement goes out when it becomes Active</legend>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked disabled /> Push notification</label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={props.email} disabled={!props.canEdit} onChange={(e) => props.onChange({ email: e.target.checked })} /> Email
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={props.sms} disabled={!props.canEdit || !props.smsAvailable}
          onChange={(e) => props.onChange({ sms: e.target.checked })} /> General SMS
      </label>
      {!props.smsAvailable && <p className="text-xs text-muted-foreground">SMS is not set up.</p>}
    </fieldset>
  );
}

/**
 * Announcements › Setup (ANN-S1): who approves (the approver grid, SB-11),
 * who may change an expiry after posting, and the default channels.
 * Both layouts; only the community admin changes it.
 */
export function AnnouncementSetupContent(): ReactNode {
  const layout = useAdminLayout();
  const { addToast } = useToast();
  const canEdit = EDITOR_ROLES.has(currentMenuRole() ?? '');
  const rights = useAnnouncementRights();
  const channels = useAnnouncementChannels();
  const server = useNotificationChannels();
  const grid = useApproverGrid('announcement');
  const levels = Object.fromEntries((grid.data?.people ?? []).map((person) => [person.user_id, person.level]));
  const saveRights = useSaveAnnouncementRights();
  const saveChannels = useSaveAnnouncementChannels();
  const [expiry, setExpiry] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);

  useEffect(() => {
    const stored = channels.data?.default_channels;
    if (stored) {
      setEmail(stored.includes('email'));
      setSms(stored.includes('sms_general'));
    }
  }, [channels.data]);

  async function save(): Promise<void> {
    const picked: AnnouncementChannel[] = ['push', ...(email ? ['email' as const] : []), ...(sms ? ['sms_general' as const] : [])];
    try {
      const rows = Object.entries(expiry).map(([user_id, on]) => ({ user_id, can_set_expiry: on }));
      if (rows.length > 0) await saveRights.mutateAsync(rows);
      await saveChannels.mutateAsync(picked);
      setExpiry({});
      addToast({ title: 'Announcement setup saved', variant: 'success' });
    } catch (error) {
      setExpiry({});
      addToast({ title: 'Setup was not saved', description: friendlyError(error), variant: 'destructive' });
    }
  }

  const unavailable = rights.data === null || channels.data === null;
  return (
    <div className="space-y-6">
      {layout === 'standard' && <PageHeader breadcrumbs={[{ label: 'Announcements', href: '/announcements' }, { label: 'Setup' }]} title="Announcements Setup" />}
      <Card>
        <CardHeader><CardTitle>Approval</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            As soon as anyone holds Approval, notices posted by others wait for them in Awaiting Approval.
            People on Level 2 or 3 approve after the level before them.
          </p>
          <ApproverGridEditor type="announcement" peopleHeader="Announcement Approvers" canEdit={canEdit} />
        </CardContent>
      </Card>
      {unavailable ? (
        <p className="text-sm text-muted-foreground">Announcement setup is not available yet on this server.</p>
      ) : rights.isLoading || channels.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card>
          <CardHeader><CardTitle>Approval and expiry rights</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <RightsGrid rows={rights.data ?? []} expiry={expiry} levels={levels} canEdit={canEdit}
              onExpiry={(userId, on) => setExpiry((current) => ({ ...current, [userId]: on }))} />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Default channels</h3>
              <DefaultChannels email={email} sms={sms} smsAvailable={server.data?.sms ?? false} canEdit={canEdit}
                onChange={(patch) => { if (patch.email !== undefined) setEmail(patch.email); if (patch.sms !== undefined) setSms(patch.sms); }} />
            </div>
            {canEdit && (
              <Button onClick={() => void save()} disabled={saveRights.isPending || saveChannels.isPending}>
                {saveRights.isPending || saveChannels.isPending ? 'Saving…' : 'Save'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
