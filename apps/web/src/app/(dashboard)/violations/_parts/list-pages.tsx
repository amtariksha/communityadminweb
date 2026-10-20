'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { CloseOutcome } from '@/hooks/use-violation-register';
import { OUTCOME_LABELS } from './labels';
import { ViolationList } from './violation-list';
import { ViolationsPage } from './violations-page';

const LOGS = ['violation'];

function CreateViolation(): ReactNode {
  return (
    <Link href="/violations/new" className={buttonVariants()} data-slot="button" data-size="default">
      Create Violation
    </Link>
  );
}

/** Open Violations › Awaiting Approval (RULE-S4). */
export function AwaitingApprovalPage(): ReactNode {
  return (
    <ViolationsPage title="Open Violations" logs={LOGS} standardActions={<CreateViolation />}>
      <ViolationList kind="awaiting_approval" title="Open Violations - Awaiting Approval" emptyText="No violations are waiting for approval." />
    </ViolationsPage>
  );
}

/** Open Violations › Warning (RULE-S5), with the "Warning period over" tick (RULE-08). */
export function WarningPage(): ReactNode {
  const [over, setOver] = useState(false);
  return (
    <ViolationsPage title="Open Violations - Warning" logs={LOGS} standardActions={<CreateViolation />}>
      <ViolationList
        kind="warning"
        title="Open Violations - Warning"
        emptyText="No violations in warning."
        extra={over ? { warning_period_over: true } : {}}
        extraFilters={
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={over} onChange={(event) => setOver(event.target.checked)} />
            Warning period over
          </label>
        }
      />
    </ViolationsPage>
  );
}

/** Open Violations › Penalty (RULE-S6), Paid / Unpaid. */
export function PenaltyPage(): ReactNode {
  const [paid, setPaid] = useState<'' | 'paid' | 'unpaid'>('');
  return (
    <ViolationsPage title="Open Violations - Penalty" logs={LOGS} standardActions={<CreateViolation />}>
      <ViolationList
        kind="penalty"
        title="Open Violations - Penalty"
        emptyText="No violations in penalty."
        extra={paid ? { paid } : {}}
        extraFilters={
          <Select aria-label="Paid or unpaid" className="w-36" value={paid} onChange={(event) => setPaid(event.target.value as typeof paid)}>
            <option value="">Paid and unpaid</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </Select>
        }
      />
    </ViolationsPage>
  );
}

/** Closed Violations (RULE-S9): rejected ones too; Close only — no Create Violation or Show Logs. */
export function ClosedPage(): ReactNode {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [outcome, setOutcome] = useState<'' | CloseOutcome>('');
  return (
    <ViolationsPage title="Closed Violations">
      <ViolationList
        kind="closed"
        title="Closed Violations"
        emptyText="There are no closed violations."
        extra={{ closed_from: from || undefined, closed_to: to || undefined, outcome: outcome || undefined }}
        extraFilters={
          <>
            <Input type="date" aria-label="Closed On from" className="w-40" value={from} onChange={(event) => setFrom(event.target.value)} />
            <Input type="date" aria-label="Closed On to" className="w-40" value={to} onChange={(event) => setTo(event.target.value)} />
            <Select aria-label="Outcome" className="w-36" value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}>
              <option value="">All outcomes</option>
              {(Object.keys(OUTCOME_LABELS) as CloseOutcome[]).map((value) => (
                <option key={value} value={value}>
                  {OUTCOME_LABELS[value]}
                </option>
              ))}
            </Select>
          </>
        }
      />
    </ViolationsPage>
  );
}
