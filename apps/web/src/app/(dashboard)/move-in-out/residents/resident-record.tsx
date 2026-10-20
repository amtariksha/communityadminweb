'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useReactivateMember, useUpdateMemberDetail, type UpdateMemberInput } from '@/hooks/use-unit-members';
import { useRemoveMember } from '@/hooks/use-units';
import { residentRecordKeys, useResidentRecord, type ResidentRecord } from '@/hooks/use-resident-record';
import { friendlyError } from '@/lib/api-error';
import { indiaDate, indiaDateTime } from '@/lib/india-time';
import { MemberForm } from '../../units/components/member-form';
import { memberFormValues, memberTags } from '../../units/components/member-form-values';
import { unitLabel } from '../components/register-presets';
import { AgreementBlock } from './agreement-block';
import { SocietyFieldsBlock } from './society-fields-block';

const TYPES: Record<string, string> = { owner: 'Owner', tenant: 'Tenant', owner_family: 'Owner Family', tenant_family: 'Tenant Family' };
const STATUS: Record<string, string> = { active: 'Active', never: 'Never logged in', no_account: 'No account' };

function ReadOnlyDetails({ record }: { record: ResidentRecord }): ReactNode {
  const { member } = record;
  const rows: Array<[string, string]> = [
    ['Name', member.name ?? '—'],
    ['Phone/Mobile', member.phone ?? '—'],
    ['Email', member.email ?? '—'],
    ['Resident Type', TYPES[member.member_type] ?? member.member_type],
    ['Tags', memberTags(member).join(', ') || '—'],
    ['Alternate Address', member.alternate_address ?? '—'],
    ['Joined On', indiaDate(member.move_in_date)],
    ['Deactivated Date', member.is_current ? '—' : indiaDate(member.move_out_date)],
    ['User Status', STATUS[member.app_status] ?? '—'],
    ['Last Login', member.last_login_at ? indiaDateTime(member.last_login_at) : '—'],
    ['ID proof', record.kyc ? `${record.kyc.id_type} (${record.kyc.status})` : '—'],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function useRecordActions(record: ResidentRecord) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const update = useUpdateMemberDetail();
  const remove = useRemoveMember();
  const reactivate = useReactivateMember();
  const ids = { unitId: record.unit.id, memberId: record.member.id };
  const refresh = () => queryClient.invalidateQueries({ queryKey: residentRecordKeys.record(record.member.id) });
  const failed = (title: string) => (error: unknown) => addToast({ title, description: friendlyError(error), variant: 'destructive' });
  const done = (title: string) => () => {
    refresh();
    addToast({ title, variant: 'success' });
  };
  return {
    saving: update.isPending,
    save: (changes: Omit<UpdateMemberInput, 'unitId' | 'memberId'>) =>
      Object.keys(changes).length > 0 && update.mutate({ ...ids, ...changes }, { onSuccess: done('Saved'), onError: failed('Could not save') }),
    deactivate: () => remove.mutate(ids, { onSuccess: done('Deactivated'), onError: failed('Could not deactivate') }),
    reactivate: () => reactivate.mutate(ids, { onSuccess: done('Re-activated'), onError: failed('Could not re-activate') }),
  };
}

function RecordBody({ record, readOnly }: { record: ResidentRecord; readOnly: boolean }): ReactNode {
  const router = useRouter();
  const actions = useRecordActions(record);
  const { member } = record;
  const locked = readOnly || !member.is_current;
  const close = () => router.back();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {member.name ?? 'Resident'} — {unitLabel(record.unit)}
        </h2>
        <div className="flex flex-wrap gap-2">
          <ShowLogsButton recordTypes={['member']} recordId={member.id} />
          {member.is_current && !readOnly && (
            <Button type="button" variant="outline" onClick={() => window.confirm('Deactivate (move out) this resident today?') && actions.deactivate()}>
              Deactivate
            </Button>
          )}
          {!member.is_current && (
            <Button type="button" onClick={() => window.confirm('Re-activate this resident?') && actions.reactivate()}>
              Re-activate
            </Button>
          )}
          <Button type="button" variant="outline" onClick={close}>
            Close
          </Button>
        </div>
      </div>
      {locked ? (
        <Card>
          <CardContent className="pt-6">
            <ReadOnlyDetails record={record} />
          </CardContent>
        </Card>
      ) : (
        <MemberForm mode="page" initial={memberFormValues(member)} saving={actions.saving} onClose={close} onSave={actions.save} />
      )}
      <SocietyFieldsBlock memberId={member.id} readOnly={locked} />
      {member.member_type === 'tenant' && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <h3 className="font-semibold">Agreement</h3>
            <AgreementBlock record={record} readOnly={locked} onSaveMemberEnd={(date) => actions.save({ lease_end_date: date })} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** The resident record (MOVE-11, screen MOVE-S9): Edit, or View (read-only) from a register row. */
export function ResidentRecordContent({ memberId, readOnly }: { memberId: string; readOnly: boolean }): ReactNode {
  const query = useResidentRecord(memberId);
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.data === null) return <p className="text-sm text-muted-foreground">The resident record is not available yet on this server.</p>;
  if (query.isError || !query.data) return <p className="text-sm text-muted-foreground">This resident was not found.</p>;
  return <RecordBody record={query.data} readOnly={readOnly} />;
}
