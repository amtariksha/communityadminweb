'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { announcementState, useAnnouncement, useAnnouncementDelivery, type Announcement, type AnnouncementDelivery } from '@/hooks';
import { formatDate } from '@/lib/utils';
import { useWord } from '@/lib/vocabulary';
import { blocksLabel, CHANNEL_LABELS, recipientsLabel, STATE_LABELS, stateVariant, typeLabel } from './labels';

function Row({ label, children }: { label: string; children: ReactNode }): ReactNode {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Attachments({ notice }: { notice: Announcement }): ReactNode {
  const urls = notice.attachment_urls ?? (notice.attachment_url ? [notice.attachment_url] : []);
  if (urls.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {urls.map((url, index) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
            {notice.attachment_names?.[index] ?? `Attachment ${index + 1}`}
          </a>
        </li>
      ))}
    </ul>
  );
}

const DECISIONS: Readonly<Record<string, string>> = {
  pending: 'Waiting',
  approved: 'Approved',
  rejected: 'Rejected',
  not_required: 'Not needed',
};

function ApprovalHistory({ notice }: { notice: Announcement }): ReactNode {
  const steps = notice.approval_history ?? [];
  if (steps.length === 0 && !notice.rejection_reason) return null;
  return (
    <section className="space-y-1">
      <h4 className="text-sm font-semibold">Approval</h4>
      {notice.submitted_at && <p className="text-xs text-muted-foreground">Submitted on {formatDate(notice.submitted_at)}</p>}
      <ul className="space-y-1 text-sm">
        {steps.map((step, index) => (
          <li key={`${step.level}-${index}`}>
            Level {step.level} · {step.approver_name ?? step.approver_role ?? 'Approver'} · {DECISIONS[step.decision] ?? step.decision}
            {step.decided_by_name && step.decided_at && ` by ${step.decided_by_name} on ${formatDate(step.decided_at)}`}
            {step.comments && ` — ${step.comments}`}
          </li>
        ))}
      </ul>
      {notice.rejection_reason && (
        <p className="text-sm text-destructive">Returned: {notice.rejection_reason}</p>
      )}
    </section>
  );
}

function statusText(counts: Record<string, number> | undefined): string {
  const entries = Object.entries(counts ?? {});
  if (entries.length === 0) return 'not sent';
  return entries.map(([status, count]) => `${status.replace(/^skipped_/, 'skipped ').replace(/_/g, ' ')} ${count}`).join(' · ');
}

function DeliverySummary({ delivery }: { delivery: AnnouncementDelivery }): ReactNode {
  return (
    <section className="space-y-1">
      <h4 className="text-sm font-semibold">Delivery</h4>
      <p className="text-sm">Sent to {delivery.recipients} people</p>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <Row label={CHANNEL_LABELS.push}>{statusText(delivery.channels.push)}</Row>
        <Row label={CHANNEL_LABELS.email}>{statusText(delivery.channels.email)}</Row>
        <Row label="SMS">{statusText(delivery.channels.sms)}</Row>
      </dl>
    </section>
  );
}

/** ANN-S6 — the full notice, its approval history and its delivery summary. */
export function NoticeDetail({ notice }: { notice: Announcement }): ReactNode {
  const word = useWord();
  const state = announcementState(notice);
  const sent = state === 'active' || state === 'retired';
  const delivery = useAnnouncementDelivery(notice.id, sent);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant={stateVariant(state)}>{STATE_LABELS[state]}</Badge>
        <Badge variant="secondary">{typeLabel(notice)}</Badge>
        {notice.source === 'member' && <Badge variant="secondary">Member announcement</Badge>}
      </div>
      <p className="whitespace-pre-wrap text-sm">{notice.body}</p>
      <Attachments notice={notice} />
      <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
        <Row label="Announcement Recipients">{recipientsLabel(notice)}</Row>
        <Row label="Block">{blocksLabel(notice)}</Row>
        <Row label={word('Author')}>{notice.author_name ?? '—'}</Row>
        <Row label={word('Published On')}>{notice.published_at ? formatDate(notice.published_at) : '—'}</Row>
        <Row label={word('Expires On')}>{notice.expires_at ? formatDate(notice.expires_at) : 'No expiry'}</Row>
        {notice.retired_at && <Row label="Retired On">{formatDate(notice.retired_at)}</Row>}
        {notice.retire_reason && <Row label="Reason">{notice.retire_reason}</Row>}
      </dl>
      <ApprovalHistory notice={notice} />
      {delivery.data && <DeliverySummary delivery={delivery.data} />}
    </div>
  );
}

/** The detail of a list row, read again for its approval history (falls back to the row). */
export function NoticeDetailOf({ row }: { row: Announcement }): ReactNode {
  const full = useAnnouncement(row.id);
  return <NoticeDetail notice={full.data ?? row} />;
}
