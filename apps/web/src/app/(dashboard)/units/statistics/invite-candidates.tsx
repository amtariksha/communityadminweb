'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ADOPTION_CRITERIA, useAdoptionCandidates, useBulkInvite, type AdoptionCandidate } from '@/hooks/use-adoption';
import { useResidentSettings } from '@/hooks/use-resident-settings';
import { friendlyError } from '@/lib/api-error';
import { formatDate } from '@/lib/utils';

const TYPE_LABELS: Readonly<Record<string, string>> = {
  owner: 'Owner',
  tenant: 'Tenant',
  owner_family: 'Owner Family',
  tenant_family: 'Tenant Family',
};

function CandidateTable({ rows }: { rows: AdoptionCandidate[] }): ReactNode {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="py-1">S.No</th>
          <th className="py-1">Name</th>
          <th className="py-1">Block-Unit</th>
          <th className="py-1">Type</th>
          <th className="py-1">Last Login</th>
          <th className="py-1">Invited On</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.member_id} className="border-b">
            <td className="py-1">{index + 1}</td>
            <td className="py-1">{row.name ?? '—'}</td>
            <td className="py-1">{row.unit}</td>
            <td className="py-1">{TYPE_LABELS[row.member_type] ?? row.member_type}</td>
            <td className="py-1">{row.last_login_at ? formatDate(row.last_login_at) : 'Never'}</td>
            <td className="py-1">{formatDate(row.invited_on)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "Send Invites – Increase Usage": criterion, Filter, the people it names, Bulk Invite. */
export function InviteCandidates(): ReactNode {
  const [choice, setChoice] = useState<string>(ADOPTION_CRITERIA[0].value);
  const [filtered, setFiltered] = useState<string | null>(null);
  const candidates = useAdoptionCandidates(filtered);
  const invite = useBulkInvite();
  const settings = useResidentSettings();
  const { addToast } = useToast();
  const rows = candidates.data?.data ?? [];

  function bulkInvite(): void {
    if (!window.confirm(`Send an invite to ${rows.length} ${rows.length === 1 ? 'person' : 'people'}?`)) return;
    invite.mutate(
      rows.map((row) => row.member_id),
      {
        onSuccess: (result) => {
          addToast({ title: `Invites: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`, variant: 'success' });
          void candidates.refetch();
        },
        onError: (error) => addToast({ title: 'Could not send invites', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <section aria-label="Send Invites" className="space-y-3">
      <h3 className="text-sm font-semibold">Send Invites – Increase Usage</h3>
      <fieldset className="grid gap-1 sm:grid-cols-2">
        <legend className="sr-only">Who to invite</legend>
        {ADOPTION_CRITERIA.map((criterion) => (
          <label key={criterion.value} className="flex items-center gap-2 text-sm">
            <input type="radio" name="invite-criterion" checked={choice === criterion.value} onChange={() => setChoice(criterion.value)} />
            {criterion.label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setFiltered(choice)}>Filter</Button>
        <Button type="button" disabled={rows.length === 0 || invite.isPending} onClick={bulkInvite}>Bulk Invite</Button>
        <Link href="/units/add-users/invite-message" className="text-sm text-primary hover:underline">Customize Invite Email</Link>
        {settings.data && !settings.data.invite_email_enabled && (
          <span className="text-xs text-muted-foreground">Invite e-mails are off: switch them on in Customize Invite Email.</span>
        )}
      </div>
      {filtered !== null && candidates.data === null && <p className="text-sm text-muted-foreground">Invite lists are not available yet on this server.</p>}
      {filtered !== null && candidates.data && (
        <div className="space-y-2">
          <p className="text-sm">{candidates.data.total} {candidates.data.total === 1 ? 'person matches' : 'people match'} this filter.</p>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">Everyone matching this filter has logged in.</p> : <CandidateTable rows={rows} />}
        </div>
      )}
    </section>
  );
}
