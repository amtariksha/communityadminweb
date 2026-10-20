'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchPresignedDownloadUrl } from '@/hooks/use-documents';
import type { ViolationDetail } from '@/hooks/use-violation-register';
import { formatDate } from '@/lib/utils';
import { OUTCOME_LABELS, rupees, STAGE_LABELS, unitLabel, VIOLATION_STATUS_LABELS } from '../_parts/labels';

function Fact({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children || '—'}</dd>
    </div>
  );
}

async function openFile(url: string, name: string): Promise<void> {
  const signed = await fetchPresignedDownloadUrl({ fileUrl: url, disposition: 'inline', fileName: name });
  window.open(signed, '_blank', 'noopener,noreferrer');
}

/** The violation's facts (RULE-S8). */
export function ViolationFacts({ violation }: { violation: ViolationDetail }): ReactNode {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Fact label="Violation No.">{violation.violation_number}</Fact>
      <Fact label="Category">{violation.category_title}</Fact>
      <Fact label="Unit">{unitLabel(violation)}</Fact>
      <Fact label="Raised On">{formatDate(violation.created_at)}</Fact>
      <Fact label="Raised By">{violation.raised_by_name}</Fact>
      <Fact label="Requested Stage">{STAGE_LABELS[violation.requested_stage]}</Fact>
      <Fact label="Status">
        {VIOLATION_STATUS_LABELS[violation.status]}
        {violation.close_outcome && ` — ${OUTCOME_LABELS[violation.close_outcome]}`}
      </Fact>
      <Fact label="Warning Ends On">{violation.warning_ends_on ? formatDate(violation.warning_ends_on) : ''}</Fact>
      <Fact label="Penalty Amount">{rupees(violation.penalty_amount)}</Fact>
      <Fact label="GST">{violation.apply_gst ? rupees(violation.gst_amount) || '18% when billed' : 'Not applied'}</Fact>
      <Fact label="Invoice">
        {violation.invoice_id && violation.invoice_number ? (
          <Link href={`/invoices?focus=${violation.invoice_id}`} className="text-primary underline">
            {violation.invoice_number}
          </Link>
        ) : (
          ''
        )}
      </Fact>
      <Fact label="Balance Due">{rupees(violation.balance_due)}</Fact>
      <div className="sm:col-span-2 lg:col-span-3">
        <Fact label="Description">
          <span className="whitespace-pre-line">{violation.description}</span>
        </Fact>
      </div>
      {violation.close_note && (
        <div className="sm:col-span-2 lg:col-span-3">
          <Fact label={violation.status === 'rejected' ? 'Reason' : 'Close Note'}>{violation.close_note}</Fact>
        </div>
      )}
      {violation.attachment_urls.length > 0 && (
        <div className="sm:col-span-2 lg:col-span-3">
          <Fact label="Attachments">
            <span className="flex flex-wrap gap-3">
              {violation.attachment_urls.map((url, index) => (
                <button key={url} type="button" className="text-primary underline" onClick={() => void openFile(url, violation.attachment_names[index] ?? 'file')}>
                  {violation.attachment_names[index] ?? `File ${index + 1}`}
                </button>
              ))}
            </span>
          </Fact>
        </div>
      )}
    </dl>
  );
}

const DECISIONS: Readonly<Record<string, string>> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  not_required: 'Not required',
};

/** Approval steps: level, approver, decision, time, comment. */
export function ViolationSteps({ violation }: { violation: ViolationDetail }): ReactNode {
  if (violation.steps.length === 0) return null;
  return (
    <Table aria-label="Approval steps">
      <TableHeader>
        <TableRow>
          <TableHead>Level</TableHead>
          <TableHead>Approver</TableHead>
          <TableHead>Decision</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Comment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {violation.steps.map((step, index) => (
          <TableRow key={`${step.level}-${step.approver_user_id ?? index}`}>
            <TableCell>Level {step.level}</TableCell>
            <TableCell>{step.approver_name ?? step.decided_by_name ?? ''}</TableCell>
            <TableCell>{DECISIONS[step.decision] ?? step.decision}</TableCell>
            <TableCell>{step.decided_at ? formatDate(step.decided_at) : ''}</TableCell>
            <TableCell>{step.comments ?? ''}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const EVENTS: Readonly<Record<string, string>> = {
  raised: 'Raised',
  approved: 'Approved',
  rejected: 'Rejected',
  moved_to_penalty: 'Moved to Penalty',
  warning_period_over: 'Warning period over',
  closed: 'Closed',
};

/** History timeline from violation_events. */
export function ViolationHistory({ violation }: { violation: ViolationDetail }): ReactNode {
  return (
    <ol aria-label="History" className="space-y-2 border-l pl-4">
      {violation.events.map((event) => (
        <li key={event.id} className="text-sm">
          <span className="font-medium">{EVENTS[event.event] ?? event.event}</span>
          <span className="text-muted-foreground">
            {' '}
            · {formatDate(event.created_at)}
            {event.actor_name ? ` · ${event.actor_name}` : ''}
          </span>
          {event.note && <div className="text-muted-foreground">{event.note}</div>}
        </li>
      ))}
    </ol>
  );
}
