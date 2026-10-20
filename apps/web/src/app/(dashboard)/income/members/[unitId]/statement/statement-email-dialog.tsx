'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useSendStatementEmail, type StatementEmailInput, type StatementEmailResult } from '@/hooks/use-billing-email';
import { statementPath, type StatementFilters, type StatementParty, type UnitStatement } from '@/hooks/use-unit-statement';
import { useUnitMembers } from '@/hooks/use-units';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isRouteMissing } from '@/lib/not-deployed';
import { statementEmailSubject } from './statement-actions';

const SETUP_NOTIFICATIONS = '/income/setup/notifications';

const RESULT_LABELS: Readonly<Record<string, string>> = {
  sent: 'Sent',
  failed: 'Failed',
  skipped_no_email: 'No e-mail address',
  queued: 'Queued',
  skipped_disabled: 'E-mail off',
};

/** The request body: the period shown, the ticked members of a unit (none = its usual recipients). */
export function statementEmailBody(input: {
  party: StatementParty;
  statement: Pick<UnitStatement, 'from' | 'to'>;
  scope: StatementFilters['scope'];
  memberIds: readonly string[];
  subject: string;
  message: string;
}): StatementEmailInput {
  const body: StatementEmailInput = {
    subject: input.subject.trim(),
    from: input.statement.from,
    to: input.statement.to,
    scope: input.party.kind === 'unit' ? input.scope : 'all',
  };
  if (input.message.trim()) body.message = input.message.trim();
  if (input.party.kind === 'unit' && input.memberIds.length > 0) body.member_ids = [...input.memberIds];
  return body;
}

function MemberPicker({ unitId, picked, onToggle }: { unitId: string; picked: readonly string[]; onToggle: (id: string, on: boolean) => void }): ReactNode {
  const members = (useUnitMembers(unitId).data ?? []).filter((member) => member.is_active !== false && !member.move_out_date);
  return (
    <fieldset className="space-y-1 text-sm">
      <legend className="font-medium">Send to</legend>
      {members.map((member) => (
        <label key={member.id} className="flex items-center gap-2">
          <input type="checkbox" checked={picked.includes(member.id)} onChange={(e) => onToggle(member.id, e.target.checked)} />
          {member.name ?? 'Member'} ({member.member_type}){member.email ? ` · ${member.email}` : ' · no e-mail'}
        </label>
      ))}
      <p className="text-xs text-muted-foreground">None ticked: the unit&apos;s recipients set under Setup › Notifications.</p>
    </fieldset>
  );
}

function Results({ rows }: { rows: readonly StatementEmailResult[] }): ReactNode {
  return (
    <Table aria-label="Recipients">
      <TableHeader>
        <TableRow>
          <TableHead>Recipient</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.recipient_name ?? '—'}</TableCell>
            <TableCell>{row.recipient_email ?? '—'}</TableCell>
            <TableCell>{(RESULT_LABELS[row.status] ?? row.status) + (row.error ? ` — ${row.error}` : '')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Failure({ error }: { error: unknown }): ReactNode {
  if (isRouteMissing(error)) return <p role="alert" className="text-sm text-destructive">Send Email is not available yet on this server.</p>;
  const off = error instanceof ApiError && error.code === 'statement_email_off';
  return (
    <p role="alert" className="text-sm text-destructive">
      {friendlyError(error)}
      {off && (
        <>
          {' '}
          <Link href={SETUP_NOTIFICATIONS} className="underline">
            Open Setup › Notifications
          </Link>
        </>
      )}
    </p>
  );
}

interface StatementEmailDialogProps {
  party: StatementParty;
  statement: UnitStatement;
  scope: StatementFilters['scope'];
  onClose: () => void;
}

/**
 * Send Email on a statement (INC-22): the resident's copy as a PDF to the
 * unit's members picked (or its usual recipients), or to a payer's e-mail
 * (INC-46), with a subject and a message; each recipient's result after.
 */
export function StatementEmailDialog({ party, statement, scope, onClose }: StatementEmailDialogProps): ReactNode {
  const send = useSendStatementEmail();
  const [picked, setPicked] = useState<string[]>([]);
  const [subject, setSubject] = useState(() => statementEmailSubject(statement));
  const [message, setMessage] = useState('');
  const results = send.data?.data;
  const toggle = (id: string, on: boolean) => setPicked((current) => (on ? [...current, id] : current.filter((value) => value !== id)));

  function submit(): void {
    send.mutate({ path: statementPath(party), body: statementEmailBody({ party, statement, scope, memberIds: picked, subject, message }) });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>{party.kind === 'unit' ? "The statement goes as a PDF, the resident's copy." : "The statement goes as a PDF to the payer's e-mail."}</DialogDescription>
        </DialogHeader>
        {results ? (
          <Results rows={results} />
        ) : (
          <div className="space-y-3 py-2">
            {party.kind === 'unit' && <MemberPicker unitId={party.id} picked={picked} onToggle={toggle} />}
            <div className="space-y-1">
              <Label htmlFor="statement-email-subject">Subject</Label>
              <Input id="statement-email-subject" maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="statement-email-message">Message</Label>
              <Textarea id="statement-email-message" maxLength={2000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            {send.error !== null && <Failure error={send.error} />}
          </div>
        )}
        <DialogFooter>
          <DialogClose>
            <Button type="button" variant="outline">
              {results ? 'Close' : 'Cancel'}
            </Button>
          </DialogClose>
          {!results && (
            <Button type="button" onClick={submit} disabled={send.isPending || subject.trim() === ''}>
              {send.isPending ? 'Sending…' : 'Send'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
