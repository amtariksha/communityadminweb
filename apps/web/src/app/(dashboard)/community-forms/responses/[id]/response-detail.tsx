'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { TextDecisionDialog } from '@/components/text-decision-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useApproveFormResponse, useFormResponse, useRejectFormResponse, type FormResponseAnswer, type FormResponseDetail } from '@/hooks/use-form-responses';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatDate } from '@/lib/utils';
import { FormsPage } from '../../_parts/forms-page';

const STATUS: Readonly<Record<string, string>> = { unapproved: 'Unapproved', approved: 'Approved', rejected: 'Rejected' };
const DECISIONS: Readonly<Record<string, string>> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', not_required: 'Not required' };

/** A file answer opens through a signed link (the shared stored-file helper): the page never holds a raw storage URL as a link. */
function AnswerValue({ answer }: { answer: FormResponseAnswer }): ReactNode {
  const openFile = useOpenStoredFile();
  if (answer.file_urls) {
    return (
      <span className="flex flex-wrap gap-3">
        {answer.file_urls.map((url, index) => (
          <button key={url} type="button" className="text-primary underline" onClick={() => void openFile(url, { fileName: answer.file_names?.[index] ?? 'file' })}>
            {answer.file_names?.[index] ?? `File ${index + 1}`}
          </button>
        ))}
      </span>
    );
  }
  if (answer.value_options) return <>{answer.value_options.join('; ')}</>;
  if (answer.acknowledged !== null) return <>{answer.acknowledged ? 'Yes' : 'No'}</>;
  if (answer.value_number !== null) return <>{answer.value_number}</>;
  if (answer.value_date) return <>{formatDate(answer.value_date)}</>;
  return <span className="whitespace-pre-line">{answer.value_text}</span>;
}

function Decide({ response }: { response: FormResponseDetail }): ReactNode {
  const [kind, setKind] = useState<'approve' | 'reject' | null>(null);
  const approve = useApproveFormResponse();
  const reject = useRejectFormResponse();
  const { addToast } = useToast();
  if (response.status !== 'unapproved' || !response.can_act) return null;
  const options = { onSuccess: () => setKind(null), onError: (failure: unknown) => addToast({ title: 'Could not record the decision', description: friendlyError(failure), variant: 'destructive' }) };
  return (
    <>
      <Button type="button" onClick={() => setKind('approve')}>Approve</Button>
      <Button type="button" variant="destructive" onClick={() => setKind('reject')}>Reject</Button>
      {kind && (
        <TextDecisionDialog
          open
          title={`${kind === 'approve' ? 'Approve' : 'Reject'} ${response.response_number}`}
          description={kind === 'approve' ? 'Your approval moves it to the next level, or approves it at the last.' : 'The member sees your reason in My responses.'}
          label={kind === 'approve' ? 'Comment (optional)' : 'Reason'}
          required={kind === 'reject'}
          maxLength={500}
          actionLabel={kind === 'approve' ? 'Approve' : 'Reject'}
          destructive={kind === 'reject'}
          busy={approve.isPending || reject.isPending}
          onClose={() => setKind(null)}
          onConfirm={(text) => (kind === 'approve' ? approve.mutate({ id: response.id, comments: text || undefined }, options) : reject.mutate({ id: response.id, reason: text }, options))}
        />
      )}
    </>
  );
}

/** Community Forms › Responses › one response (FORM-S5). */
export function ResponseDetail({ id }: { id: string }): ReactNode {
  const query = useFormResponse(id);
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.error || !query.data) {
    const missing = query.error instanceof ApiError && query.error.code === 'community_form_response_not_found';
    return <p className="text-sm text-muted-foreground">{!missing && isNotDeployed(query.error) ? 'Community Forms is not available yet.' : 'Response not found'}</p>;
  }
  const response = query.data;
  return (
    <FormsPage title={response.response_number}>
      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-wrap gap-2">
            <Decide response={response} />
            <ShowLogsButton recordTypes={['community_form_response']} recordId={response.id} />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">Response No.</dt><dd>{response.response_number}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Form</dt><dd>{response.form_name}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Status</dt><dd>{STATUS[response.status]}{response.current_level ? ` — Level ${response.current_level}` : ''}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Submitted On</dt><dd>{formatDate(response.submitted_at)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Submitted By</dt><dd>{response.respondent_name ?? ''}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Unit</dt><dd>{response.block ? `${response.block} - ` : ''}{response.unit_number ?? ''}</dd></div>
          </dl>
          {response.rejection_reason && <p className="text-sm">Reason: {response.rejection_reason}</p>}
          <section className="space-y-2">
            <h3 className="text-base font-semibold">Answers</h3>
            <ol className="space-y-2">
              {response.answers.map((answer) => (
                <li key={answer.question_id} className="text-sm">
                  <div className="font-medium">{answer.position}. {answer.question_text}</div>
                  <div><AnswerValue answer={answer} /></div>
                </li>
              ))}
            </ol>
          </section>
          {response.steps.length > 0 && (
            <Table aria-label="Approval history">
              <TableHeader><TableRow><TableHead>Level</TableHead><TableHead>Approver</TableHead><TableHead>Decision</TableHead><TableHead>Time</TableHead><TableHead>Comment</TableHead></TableRow></TableHeader>
              <TableBody>
                {response.steps.map((step, index) => (
                  <TableRow key={`${step.level}-${index}`}>
                    <TableCell>Level {step.level}</TableCell>
                    <TableCell>{step.approver_name ?? step.decided_by_name ?? ''}</TableCell>
                    <TableCell>{DECISIONS[step.decision] ?? step.decision}</TableCell>
                    <TableCell>{step.decided_at ? formatDate(step.decided_at) : ''}</TableCell>
                    <TableCell>{step.comments ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Link href={`/community-forms/responses/${response.status}`} className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
            Close
          </Link>
        </CardContent>
      </Card>
    </FormsPage>
  );
}
