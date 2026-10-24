'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction } from '@/components/data-table';
import { useFormMode } from '@/components/form-page';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import {
  unidentifiedParams,
  useUnidentifiedCollections,
  visiblePage,
  type UnidentifiedCollection,
  type UnidentifiedFilters,
} from '@/hooks/use-unidentified-collections';
import { todayIST } from '@/lib/date';
import type { FinanceAccess } from '@/lib/finance-roles';
import { useAdminLayout } from '@/lib/layout-context';
import { isRouteMissing } from '@/lib/not-deployed';
import { MemberIncomeLinks } from '../member-income-links';
import { UNIDENTIFIED_HREF } from '../member-row-actions';
import { IdentifyDialog } from './identify-dialog';
import { RecordUnidentifiedForm } from './record-form';
import { UNIDENTIFIED_COLUMNS } from './unidentified-columns';
import { UnidentifiedFilterControls } from './unidentified-filters';

/** Identify, on open rows only, for the finance writers (an identified collection is set against its unit for good). */
export function unidentifiedActions(access: FinanceAccess, onIdentify: (row: UnidentifiedCollection) => void): DataTableAction<UnidentifiedCollection>[] {
  if (!access.canWrite) return [];
  return [{ key: 'identify', header: 'Identify', label: 'Identify', onClick: onIdentify, hidden: (row) => row.status !== 'open' }];
}

/**
 * Member Income › Unidentified Collection (INC-S22, INC-48): money received
 * without a flat reference — record it at once, identify it to a unit
 * later. Open rows by default; status, dates and a search by reference,
 * a page at a time, with the whole filtered list as PDF / Excel / CSV.
 */
export function UnidentifiedContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const mode = useFormMode();
  const router = useRouter();
  const access = useFinanceAccess();
  const [filters, setFilters] = useState<UnidentifiedFilters>({ status: 'open', from: '', to: '', search: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [identifying, setIdentifying] = useState<UnidentifiedCollection | null>(null);
  const [recording, setRecording] = useState(false);
  const query = useUnidentifiedCollections(filters, { page, limit: pageSize });
  const rows = visiblePage(query.data?.data ?? [], { page, limit: pageSize });
  const change = (patch: Partial<UnidentifiedFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  if (isRouteMissing(query.error)) {
    return <p className="text-sm text-muted-foreground">Unidentified collections are not available yet on this server.</p>;
  }
  return (
    <div className="space-y-4">
      {classic ? <MemberIncomeLinks current={UNIDENTIFIED_HREF} /> : <PageHeader title="Unidentified Collection" description="Money received without a flat reference, until it is set against a unit." />}
      {access.canWrite && (
        <Button type="button" onClick={() => (mode === 'page' ? router.push(`${UNIDENTIFIED_HREF}/new`) : setRecording(true))}>
          Record unidentified collection
        </Button>
      )}
      <DataTable<UnidentifiedCollection>
        title="Unidentified Collections"
        columns={UNIDENTIFIED_COLUMNS}
        rows={[...rows]}
        rowKey={(row) => row.id}
        total={query.data?.total ?? rows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        search={{ value: filters.search, onChange: (search) => change({ search }), placeholder: 'Payment number or narration' }}
        filters={<UnidentifiedFilterControls value={filters} onChange={change} />}
        actions={unidentifiedActions(access, setIdentifying)}
        export={{ path: '/receipts/unidentified/export', params: unidentifiedParams(filters), filename: 'unidentified-collections' }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No unidentified collections."
      />
      {identifying && <IdentifyDialog collection={identifying} onClose={() => setIdentifying(null)} />}
      {recording && <RecordUnidentifiedForm mode="dialog" open today={todayIST()} onClose={() => setRecording(false)} onRecorded={() => setRecording(false)} />}
    </div>
  );
}
