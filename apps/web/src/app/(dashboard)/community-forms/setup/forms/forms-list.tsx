'use client';

import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useCommunityForms, usePublishCommunityForm, type CommunityForm, type FormStatus } from '@/hooks/use-community-forms';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatDate } from '@/lib/utils';
import { FormsPage } from '../../_parts/forms-page';
import { AUDIENCE_LABELS, FORM_STATUS_LABELS } from '../../_parts/labels';

const COLUMNS: readonly DataTableColumn<CommunityForm>[] = [
  { key: 'name', header: 'Form Name', cell: (row) => row.name, className: 'font-medium' },
  { key: 'audience', header: 'Who Can Respond', cell: (row) => AUDIENCE_LABELS[row.audience] },
  { key: 'questions', header: 'Questions', cell: (row) => String(row.question_count) },
  { key: 'responses', header: 'Responses', cell: (row) => String(row.response_count) },
  { key: 'status', header: 'Status', cell: (row) => FORM_STATUS_LABELS[row.status] },
  { key: 'created', header: 'Created On', cell: (row) => formatDate(row.created_at) },
];

const STATUSES: readonly FormStatus[] = ['draft', 'unpublished', 'published'];

function CreateForm(): ReactNode {
  return (
    <Link href="/community-forms/new" className={buttonVariants()} data-slot="button" data-size="default">
      Create Form
    </Link>
  );
}

/** Publish or Unpublish from the list, after a confirm (the confirm is Publish's "Yes, I want to publish"). */
function usePublishToggle() {
  const toggle = usePublishCommunityForm();
  const { addToast } = useToast();
  return (form: CommunityForm) => {
    const publish = form.status !== 'published';
    const question = publish ? `Yes, I want to publish "${form.name}".` : `Unpublish "${form.name}"? Members can no longer respond.`;
    if (!window.confirm(question)) return;
    toggle.mutate(
      { id: form.id, publish },
      {
        onSuccess: () => addToast({ title: publish ? 'Form published' : 'Form unpublished', variant: 'success' }),
        onError: (failure) => addToast({ title: publish ? 'Could not publish' : 'Could not unpublish', description: friendlyError(failure), variant: 'destructive' }),
      },
    );
  };
}

/**
 * Community Forms › Setup › Setup Community Form (FORM-S2): the society's
 * forms by status (Published first), name search, the shared table with
 * Edit, Publish / Unpublish and View Responses.
 */
export function FormsList(): ReactNode {
  const [status, setStatus] = useState<FormStatus>('published');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const list = useCommunityForms({ status, q: q || undefined, page, limit: 25 });
  const togglePublish = usePublishToggle();
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  const actions: DataTableAction<CommunityForm>[] = [
    { key: 'edit', header: 'Edit', label: 'Edit', href: (row) => `/community-forms/${row.id}/edit` },
    { key: 'publish', header: 'Publish / Unpublish', label: (row) => (row.status === 'published' ? 'Unpublish' : 'Publish'), onClick: togglePublish },
  ];

  if (list.error && isNotDeployed(list.error)) {
    return (
      <FormsPage title="Setup Community Form">
        <p className="text-sm text-muted-foreground">Community Forms is not available yet.</p>
      </FormsPage>
    );
  }
  return (
    <FormsPage title="Setup Community Form" logs={['community_form']} standardActions={<CreateForm />}>
      <DataTable<CommunityForm>
        title="Community Forms"
        serialHeader="Sl.No"
        columns={COLUMNS}
        actions={actions}
        rows={list.data?.data ?? []}
        rowKey={(row) => row.id}
        total={list.data?.total ?? 0}
        page={page}
        pageSize={25}
        pageSizeOptions={[25]}
        onPageChange={setPage}
        search={{ value: q, onChange: onSearch, placeholder: 'Search by form name' }}
        filters={
          <Select aria-label="Status" className="w-40" value={status} onChange={(event) => { setStatus(event.target.value as FormStatus); setPage(1); }}>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {FORM_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        }
        export={{ path: '/community-forms/export', params: { status, ...(q ? { q } : {}) }, filename: 'community-forms' }}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyText="There are no forms."
      />
    </FormsPage>
  );
}
