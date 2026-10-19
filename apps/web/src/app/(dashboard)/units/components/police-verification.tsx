'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { ApiError, friendlyError } from '@/lib/api-error';
import { POLICE_VERIFICATION_STATUSES, useUpdatePoliceVerification } from '@/hooks';
import type { OnboardingSummary, PoliceVerificationStatus } from '@/hooks';

/**
 * MOVE-04 — police verification of the tenant on the unit's current lease:
 * a status (Not started · Submitted · Verified · Rejected) and the police
 * reference, saved with PATCH /tenant-lifecycle/onboardings/:id/verification.
 */

export const POLICE_VERIFICATION_LABEL: Record<PoliceVerificationStatus, string> = {
  not_started: 'Not started',
  submitted: 'Submitted',
  verified: 'Verified',
  rejected: 'Rejected',
};

const MAX_REF = 100;

interface PoliceVerificationProps {
  lease: OnboardingSummary;
}

export function PoliceVerification({ lease }: PoliceVerificationProps): ReactNode {
  const { addToast } = useToast();
  const update = useUpdatePoliceVerification();
  const [status, setStatus] = useState<PoliceVerificationStatus>(lease.police_verification_status ?? 'not_started');
  const [reference, setReference] = useState(lease.police_verification_ref ?? '');

  useEffect(() => {
    setStatus(lease.police_verification_status ?? 'not_started');
    setReference(lease.police_verification_ref ?? '');
  }, [lease.id, lease.police_verification_status, lease.police_verification_ref]);

  const unchanged =
    status === (lease.police_verification_status ?? 'not_started') &&
    reference.trim() === (lease.police_verification_ref ?? '');

  function save(): void {
    update.mutate(
      { onboarding_id: lease.id, police_verification_status: status, police_verification_ref: reference.trim() || null },
      {
        onSuccess() {
          addToast({ title: 'Police verification saved', variant: 'success' });
        },
        onError(error) {
          const notYet = error instanceof ApiError && error.status === 404;
          addToast({
            title: notYet ? 'Police verification is not available yet' : 'Could not save police verification',
            description: notYet ? 'It becomes available once the server is updated.' : friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <div className="ml-3 flex flex-wrap items-end gap-2" data-testid="police-verification">
      <div className="space-y-1">
        <label htmlFor={`pv-status-${lease.id}`} className="text-xs text-muted-foreground">
          Police verification
        </label>
        <Select
          id={`pv-status-${lease.id}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as PoliceVerificationStatus)}
        >
          {POLICE_VERIFICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {POLICE_VERIFICATION_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <label htmlFor={`pv-ref-${lease.id}`} className="text-xs text-muted-foreground">
          Reference
        </label>
        <Input
          id={`pv-ref-${lease.id}`}
          value={reference}
          maxLength={MAX_REF}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Police reference no."
          className="h-9 w-44"
        />
      </div>
      <Button size="sm" variant="outline" onClick={save} disabled={unchanged || update.isPending}>
        {update.isPending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}
