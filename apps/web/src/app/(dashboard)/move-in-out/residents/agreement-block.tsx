'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useUploadFileToS3 } from '@/hooks';
import { useUpdateLeaseAgreement, type ResidentRecord } from '@/hooks/use-resident-record';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import type { OnboardingSummary } from '@/hooks/use-tenant-lifecycle';
import { friendlyError } from '@/lib/api-error';
import { checkUploadFile } from '@/lib/validation';
import { PoliceVerification } from '../../units/components/police-verification';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

interface AgreementBlockProps {
  record: ResidentRecord;
  readOnly: boolean;
  /** A tenant with no lease row saves the end date on the member (Edit Member's field). */
  onSaveMemberEnd: (date: string) => void;
}

function NoAgreement({ record, readOnly, onSaveMemberEnd }: AgreementBlockProps): ReactNode {
  const [end, setEnd] = useState(record.member.lease_end_date?.slice(0, 10) ?? '');
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">No agreement on file.</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="record-member-end">Agreement End</Label>
          <Input id="record-member-end" type="date" value={end} readOnly={readOnly} disabled={readOnly} onChange={(event) => setEnd(event.target.value)} />
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" disabled={!end} onClick={() => onSaveMemberEnd(end)}>
            Save Agreement End
          </Button>
        )}
      </div>
    </div>
  );
}

/** The lease block of a tenant's record (MOVE-S9): agreement dates and copy, police verification. */
export function AgreementBlock(props: AgreementBlockProps): ReactNode {
  const { record, readOnly } = props;
  const lease = record.lease;
  const { addToast } = useToast();
  const update = useUpdateLeaseAgreement();
  const upload = useUploadFileToS3();
  const openFile = useOpenStoredFile();
  const [start, setStart] = useState(lease?.lease_start_date ?? '');
  const [end, setEnd] = useState(lease?.lease_end_date ?? '');
  useEffect(() => {
    setStart(lease?.lease_start_date ?? '');
    setEnd(lease?.lease_end_date ?? '');
  }, [lease?.lease_start_date, lease?.lease_end_date]);
  if (!lease) return <NoAgreement {...props} />;

  const failed = (error: unknown) => addToast({ title: 'Could not save the agreement', description: friendlyError(error), variant: 'destructive' });
  const saveDates = () =>
    update.mutate(
      { leaseId: lease.id, memberId: record.member.id, lease_start_date: start, lease_end_date: end },
      { onSuccess: () => addToast({ title: 'Agreement saved', variant: 'success' }), onError: failed },
    );

  async function attach(file: File | undefined): Promise<void> {
    if (!file || !lease) return;
    const check = checkUploadFile(file);
    if (!check.ok) return void addToast({ title: check.error, variant: 'destructive' });
    if (file.size > MAX_BYTES) return void addToast({ title: 'The agreement copy is at most 10 MB.', variant: 'destructive' });
    try {
      const stored = await upload.mutateAsync({ file });
      update.mutate(
        { leaseId: lease.id, memberId: record.member.id, agreement_document_url: stored.fileUrl, agreement_document_key: stored.key },
        { onSuccess: () => addToast({ title: 'Agreement copy saved', variant: 'success' }), onError: failed },
      );
    } catch (error) {
      failed(error);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="record-lease-start">Agreement Start</Label>
          <Input id="record-lease-start" type="date" value={start} readOnly={readOnly} disabled={readOnly} onChange={(event) => setStart(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="record-lease-end">Agreement End</Label>
          <Input id="record-lease-end" type="date" value={end} readOnly={readOnly} disabled={readOnly} onChange={(event) => setEnd(event.target.value)} />
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" disabled={update.isPending || !start || !end || end < start} onClick={saveDates}>
            Save Dates
          </Button>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <span className="font-medium">Agreement Copy: </span>
        {lease.agreement_document_url ? (
          <button type="button" className="text-primary hover:underline" onClick={() => void openFile(lease.agreement_document_url ?? '')}>
            Open
          </button>
        ) : (
          <span className="text-muted-foreground">none</span>
        )}
        {!readOnly && (
          <Input aria-label="Upload agreement copy" type="file" accept={ACCEPT} className="mt-1" onChange={(event) => void attach(event.target.files?.[0])} />
        )}
      </div>
      {!readOnly && <PoliceVerification lease={lease as unknown as OnboardingSummary} />}
      {readOnly && (
        <p className="text-sm">
          Police Verification: {lease.police_verification_status ?? 'not_started'}
          {lease.police_verification_ref ? ` (${lease.police_verification_ref})` : ''}
        </p>
      )}
    </div>
  );
}
