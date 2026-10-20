'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import {
  useApproveFormResponse,
  useFormResponses,
  useRejectFormResponse,
  type FormResponseRow,
  type ResponseQueue,
  type ResponseStatus,
} from '@/hooks/use-form-responses';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatDate } from '@/lib/utils';
import { TextDecisionDialog } from '@/components/text-decision-dialog';
import { FormsPage } from '../_parts/forms-page';

const STATUS_LABELS: Readonly<Record<ResponseStatus, string>> = { unapproved: 'Unapproved', approved: 'Approved', rejected: 'Rejected' };
const QUEUES: ReadonlyArray<readonly [ResponseQueue, string]> = [
  ['mine', 'My Approvals Required'],
  ['level1', 'Level 1 Approval'],
  ['level2', 'Level 2 Approval'],
  ['level3', 'Level 3 Approval'],
];

const COLUMNS: readonly DataTableColumn<FormResponseRow>[] = [
  { key: 'number', header: 'Response No.', cell: (row) => row.response_number, className: 'font-medium' },
  { key: 'form', header: 'Form Name', cell: (row) => row.form_name },
  { key: 'submitted', header: 'Submitted On', cell: (row) => formatDate(row.submitted_at) },
  { key: 'by', header: 'Submitted By', cell: (row) => row.respondent_name ?? '' },
  { key: 'unit', header: 'Unit', cell: (row) => (row.block ? `${row.block} - ${row.unit_number ?? ''}` : row.unit_number ?? '') },
  { key: 'level', header: 'Current Level', cell: (row) => (row.current_level ? `Level ${row.current_level}` : '') },
  { key: 'status', header: 'Status', cell: (row) => STATUS_LABELS[row.status] },
];

type Decision = { kind: 'approve' | 'reject'; row: FormResponseRow } | null;

function useDecisions() {
  const [decision, setDecision] = useState<Decision>(null);
  const approve = useApproveFormResponse();
  const reject = useRejectFormResponse();
  const { addToast } = useToast();
  const close = () => setDecision(null);
  const options = (title: string) => ({
    onSuccess: () => {
      addToast({ title, variant: 'success' });
      close();
    },
    onError: (failure: unknown) => addToast({ title: 'Could not record the decision', description: friendlyError(failure), variant: 'destructive' }),
  });
  const dialog = decision && (
    <TextDecisionDialog
      open
      title={`${decision.kind === 'approve' ? 'Approve' : 'Reject'} ${decision.row.response_number}`}
      description={decision.kind === 'approve' ? 'Your approval moves it to the next level, or approves it at the last.' : 'The member sees your reason in My responses.'}
      label={decision.kind === 'approve' ? 'Comment (optional)' : 'Reason'}
      required={decision.kind === 'reject'}
      maxLength={500}
      actionLabel={decision.kind === 'approve' ? 'Approve' : 'Reject'}
      destructive={decision.kind === 'reject'}
      busy={approve.isPending || reject.isPending}
      onClose={close}
      onConfirm={(text) =>
        decision.kind === 'approve'
          ? approve.mutate({ id: decision.row.id, comments: text || undefined }, options('Approved'))
          : reject.mutate({ id: decision.row.id, reason: text }, options('Rejected'))
      }
    />
  );
  return { askApprove: (row: FormResponseRow) => setDecision({ kind: 'approve', row }), askReject: (row: FormResponseRow) => setDecision({ kind: 'reject', row }), dialog };
}

/**
 * Community Forms › Responses (FORM-S4): the status from the route (SB-05);
 * on Unapproved a queue select (My Approvals Required first) and Approve /
 * Reject for the viewer's pending steps; search by form name.
 */
export function ResponsesList({ status }: { status: ResponseStatus }): ReactNode {
  const formId = useSearchParams()?.get('form_id') ?? undefined;
  const [queue, setQueue] = useState<ResponseQueue>('mine');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const filters = { status, queue: status === 'unapproved' ? queue : undefined, q: q || undefined, form_id: formId };
  const list = useFormResponses({ ...filters, page, limit: 25 });
  const decisions = useDecisions();
  const rows = list.data?.data ?? [];
  const anyCanAct = rows.some((row) => row.can_act);
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  const actions = useMemo(() => {
    const view: DataTableAction<FormResponseRow> = { key: 'view', header: 'View', label: 'View', href: (row) => `/community-forms/responses/${row.id}` };
    if (status !== 'unapproved' || !anyCanAct) return [view];
    return [
      view,
      { key: 'approve', header: 'Approve', label: 'Approve', onClick: decisions.askApprove, hidden: (row: FormResponseRow) => !row.can_act },
      { key: 'reject', header: 'Reject', label: 'Reject', onClick: decisions.askReject, hidden: (row: FormResponseRow) => !row.can_act },
    ];
  }, [status, anyCanAct, decisions.askApprove, decisions.askReject]);

  if (list.error && isNotDeployed(list.error)) {
    return (
      <FormsPage title="Responses">
        <p className="text-sm text-muted-foreground">Community Forms is not available yet.</p>
      </FormsPage>
    );
  }
  return (
    <FormsPage title={`Responses - ${STATUS_LABELS[status]}`} logs={['community_form_response']}>
      <DataTable<FormResponseRow>
        title={`${STATUS_LABELS[status]} Responses`}
        serialHeader="Sl.No"
        columns={COLUMNS}
        actions={actions}
        rows={rows}
        rowKey={(row) => row.id}
        total={list.data?.total ?? 0}
        page={page}
        pageSize={25}
        pageSizeOptions={[25]}
        onPageChange={setPage}
        search={{ value: q, onChange: onSearch, placeholder: 'Search by Form Name' }}
        filters={
          status === 'unapproved' ? (
            <Select aria-label="Queue" className="w-56" value={queue} onChange={(event) => { setQueue(event.target.value as ResponseQueue); setPage(1); }}>
              {QUEUES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          ) : undefined
        }
        export={{ path: '/community-forms/responses/export', params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>, filename: `form-responses-${status}` }}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyText="No responses."
      />
      {decisions.dialog}
    </FormsPage>
  );
}
