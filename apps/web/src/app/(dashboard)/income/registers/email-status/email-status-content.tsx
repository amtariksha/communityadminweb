'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import {
  billingEmailParams,
  useBillingEmailLog,
  useResendBillingEmail,
  type BillingEmailFilters,
  type BillingEmailRow,
} from '@/hooks/use-billing-email';
import { ApiError, friendlyError } from '@/lib/api-error';
import { canWriteFinance } from '@/lib/finance-roles';
import { currentRole } from '@/lib/current-role';
import { useAdminLayout } from '@/lib/layout-context';
import { formatDate } from '@/lib/utils';

type Criteria = Pick<BillingEmailFilters, 'email' | 'subject' | 'from' | 'to'>;

export const EMAIL_STATUS_LABEL: Record<string, string> = {
  queued: 'Queued',
  sent: 'Sent',
  failed: 'Failed',
  skipped_no_email: 'Skipped (no e-mail address)',
  skipped_disabled: 'Skipped (turned off)',
};

export function emailNotes(notes: string | null): string {
  if (notes === 'transport_disabled') return 'E-mail is not configured on the server';
  return notes ?? '';
}

function FilterRow({ onFetch }: { onFetch: (criteria: Criteria) => void }): ReactNode {
  const [criteria, setCriteria] = useState<Criteria>({});
  const set = (key: keyof Criteria, value: string): void => setCriteria((p) => ({ ...p, [key]: value || undefined }));
  function submit(event: FormEvent): void {
    event.preventDefault();
    onFetch(criteria);
  }
  return (
    <form aria-label="Fetch e-mails" onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-md border p-4">
      <div className="space-y-1">
        <Label htmlFor="mail-email">Email ID</Label>
        <Input id="mail-email" className="w-56" value={criteria.email ?? ''} onChange={(e) => set('email', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mail-subject">Subject</Label>
        <Input id="mail-subject" className="w-56" value={criteria.subject ?? ''} onChange={(e) => set('subject', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mail-from">Sent Date: From</Label>
        <Input id="mail-from" type="date" className="w-40" value={criteria.from ?? ''} onChange={(e) => set('from', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mail-to">Sent Date: To</Label>
        <Input id="mail-to" type="date" className="w-40" value={criteria.to ?? ''} onChange={(e) => set('to', e.target.value)} />
      </div>
      <Button type="submit">Fetch</Button>
    </form>
  );
}

/** Receipts & Invoices › Email Status Monitor (INC-S28, INC-31): what reached whom. */
export function EmailStatusContent(): ReactNode {
  const { addToast } = useToast();
  const classic = useAdminLayout() === 'classic';
  const canWrite = useMemo(() => canWriteFinance(currentRole()), []);
  const [criteria, setCriteria] = useState<Criteria>({});
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const log = useBillingEmailLog({ ...criteria, q, page, limit: pageSize });
  const resend = useResendBillingEmail();
  const missing = log.error instanceof ApiError && log.error.status === 404;

  async function again(row: BillingEmailRow): Promise<void> {
    try {
      const result = await resend.mutateAsync(row.id);
      addToast({
        title: result.status === 'sent' ? 'E-mail sent' : 'E-mail not sent',
        description: result.status === 'sent' ? row.email ?? undefined : emailNotes(result.error),
        variant: result.status === 'sent' ? 'success' : 'destructive',
      });
    } catch (error) {
      addToast({ title: 'Could not send', description: friendlyError(error), variant: 'destructive' });
    }
  }

  const columns: DataTableColumn<BillingEmailRow>[] = [
    { key: 'name', header: 'Name', cell: (r) => r.name ?? '', text: (r) => r.name ?? '' },
    { key: 'unit', header: 'Unit No', cell: (r) => r.unit_label ?? '', text: (r) => r.unit_label ?? '' },
    { key: 'email', header: 'Email ID', cell: (r) => r.email ?? '', text: (r) => r.email ?? '' },
    { key: 'subject', header: 'Subject', cell: (r) => r.subject, text: (r) => r.subject },
    { key: 'sent', header: 'Sent Date', cell: (r) => formatDate(r.sent_date), text: (r) => formatDate(r.sent_date) },
    { key: 'status', header: 'Email Status', cell: (r) => EMAIL_STATUS_LABEL[r.status] ?? r.status, text: (r) => EMAIL_STATUS_LABEL[r.status] ?? r.status },
    { key: 'notes', header: 'Notes', cell: (r) => emailNotes(r.notes), text: (r) => emailNotes(r.notes) },
  ];

  return (
    <div className="space-y-6">
      {!classic && <PageHeader title="Email Status Monitor" description="Every invoice, receipt and credit note e-mailed, and whether it reached the member." />}
      <FilterRow onFetch={(next) => { setCriteria(next); setPage(1); }} />
      {missing ? (
        <p className="text-sm text-muted-foreground">The Email Status Monitor is not available yet on this server.</p>
      ) : (
        <DataTable
          title="Email Status Monitor"
          columns={columns}
          rows={log.data?.data ?? []}
          rowKey={(r) => r.id}
          total={log.data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          search={{ value: q, onChange: (value) => { setQ(value); setPage(1); }, placeholder: 'Search name, e-mail, subject or unit' }}
          actions={canWrite ? [{ key: 'again', header: 'E-mail again', label: 'E-mail again', onClick: (row) => void again(row), hidden: (row) => row.status !== 'failed' || !row.email }] : undefined}
          export={{ path: '/billing-email-log/export', params: billingEmailParams({ ...criteria, q }), filename: 'email-status' }}
          loading={log.isLoading}
          error={log.error}
          onRetry={() => void log.refetch()}
          emptyText="No e-mails in this period."
        />
      )}
    </div>
  );
}
