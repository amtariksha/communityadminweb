'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { useToast } from '@/components/ui/toast';
import { useCloseIncident, useGateIncidents, incidentParams, type GateIncident, type IncidentFilters } from '@/hooks/use-gate-incidents';
import { useIncidentCategories } from '@/hooks/use-gate-lists';
import { useGates } from '@/hooks/use-staff';
import { canWriteGateSetup } from '../../setup/blocks/setup-block';
import { DayRangeFilter, REGISTER_PAGE_SIZES, indiaDateTime, useRegisterState } from '../register-kit';
import { IncidentDetailDialog } from './incident-detail-dialog';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

const COLUMNS: DataTableColumn<GateIncident>[] = [
  { key: 'no', header: 'Incident No.', cell: (row) => String(row.incident_no), className: 'tabular-nums' },
  { key: 'date', header: 'Incident Date', cell: (row) => indiaDateTime(row.occurred_at), className: 'whitespace-nowrap' },
  { key: 'category', header: 'Category', cell: (row) => row.category_name },
  { key: 'description', header: 'Description', cell: (row) => row.description },
  { key: 'gate', header: 'Gate', cell: (row) => row.gate_name ?? '—' },
  { key: 'raised', header: 'Raised By', cell: (row) => row.raised_by_name ?? '—' },
  { key: 'status', header: 'Status', cell: (row) => (row.status === 'open' ? 'Open' : 'Closed') },
];

/**
 * Gate & Visitors › Incident Investigator › Incidents (GATE-S7, GATE-42):
 * the incidents guards raised, with date range, category, gate, status and a
 * search over the description; View shows the photos and, for the gate
 * admins, Close Incident with a remark. No "add" — guards raise them.
 */
export function IncidentsContent(): ReactNode {
  const state = useRegisterState('all');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [gate, setGate] = useState('');
  const [viewing, setViewing] = useState<GateIncident | null>(null);
  const canClose = useMemo(() => canWriteGateSetup(), []);
  const categories = useIncidentCategories(true);
  const gates = useGates({ includeInactive: true });
  const close = useCloseIncident();
  const { addToast } = useToast();

  const filters: IncidentFilters = {
    date_from: state.range.from || undefined,
    date_to: state.range.to || undefined,
    status: (status || undefined) as IncidentFilters['status'],
    category_id: category || undefined,
    gate_id: gate || undefined,
    q: state.q || undefined,
  };
  const query = useGateIncidents({ ...filters, page: state.page, limit: state.pageSize });
  const pick = (set: (value: string) => void) => (value: string) => {
    set(value);
    state.setPage(1);
  };

  async function closeIncident(remark: string): Promise<void> {
    if (!viewing) return;
    await close.mutateAsync({ id: viewing.id, closing_remark: remark });
    addToast({ title: `Incident ${viewing.incident_no} closed`, variant: 'success' });
  }

  if (query.data === null) {
    return <p className="text-sm text-muted-foreground">The incident log is not available yet.</p>;
  }

  return (
    <div className="space-y-3">
      <DataTable<GateIncident>
        title="Incidents"
        columns={COLUMNS}
        actions={[{ key: 'view', header: 'View', label: 'View', onClick: setViewing }]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        pageSizeOptions={REGISTER_PAGE_SIZES}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
        search={{ value: state.q, onChange: state.setQ, placeholder: 'Words of the description' }}
        filters={
          <>
            <DayRangeFilter value={state.range} onChange={state.setRange} />
            <CountedSelect id="incident-status" label="Status" value={status} allLabel="All" options={STATUS_OPTIONS} onChange={pick(setStatus)} />
            <CountedSelect
              id="incident-category"
              label="Category"
              value={category}
              allLabel="All"
              options={(categories.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
              onChange={pick(setCategory)}
            />
            <CountedSelect
              id="incident-gate"
              label="Gate"
              value={gate}
              allLabel="All"
              options={(gates.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
              onChange={pick(setGate)}
            />
          </>
        }
        export={{ path: '/gate/incidents/export', params: incidentParams(filters), filename: 'incidents' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No incidents in this period."
      />
      <IncidentDetailDialog incident={viewing} canClose={canClose} onClose={() => setViewing(null)} closeIncident={closeIncident} />
    </div>
  );
}
