'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links/block-links';
import { DataTable, type DataTableAction } from '@/components/data-table';
import { canTickChecklists } from '@/components/move-checklist';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { downloadNoc, moveOutParams, useMoveOuts, useResendNoc, type MoveOut, type MoveOutState } from '@/hooks/use-move-outs';
import { friendlyError } from '@/lib/api-error';
import { MOVE_OUT_COLUMNS, NOT_AVAILABLE, STATE_TITLES, unitLabelOf } from './noc-cells';
import { NocStepDialog, type NocStep } from './noc-dialogs';
import { NocViewDialog } from './noc-view-dialog';
import { StartMoveOutDialog } from './start-move-out-dialog';

const PAGE_SIZES = [25, 50, 100] as const;

interface Handlers {
  view: (row: MoveOut) => void;
  step: (step: NocStep) => void;
  resend: (row: MoveOut) => void;
  download: (row: MoveOut) => void;
}

/** The row buttons of each list (MOVE-S11). Issue NOC waits for the approvals. */
export function nocActions(state: MoveOutState, on: Handlers): DataTableAction<MoveOut>[] {
  const view: DataTableAction<MoveOut> = { key: 'view', header: 'Action', label: 'View', onClick: on.view };
  if (state === 'initiated') {
    return [
      view,
      { key: 'issue', header: '', label: 'Issue NOC', hidden: (row) => !row.approved, onClick: (row) => on.step({ kind: 'issue', row }) },
      { key: 'cancel', header: '', label: 'Cancel', onClick: (row) => on.step({ kind: 'cancel', row }) },
    ];
  }
  if (state === 'sent') {
    return [
      view,
      { key: 'resend', header: '', label: 'Resend NOC', onClick: on.resend },
      { key: 'submitted', header: '', label: 'Mark Submitted', onClick: (row) => on.step({ kind: 'submit', row }) },
      { key: 'noc', header: '', label: 'NOC', onClick: on.download },
    ];
  }
  return [
    view,
    { key: 'complete', header: '', label: 'Complete Move-Out', onClick: (row) => on.step({ kind: 'complete', row }) },
    { key: 'noc', header: '', label: 'NOC', onClick: on.download },
  ];
}

function useNocHandlers(setViewing: (row: MoveOut) => void, setStep: (step: NocStep) => void): Handlers {
  const resend = useResendNoc();
  const { addToast } = useToast();
  const failed = (title: string) => (error: unknown) => addToast({ title, description: friendlyError(error), variant: 'destructive' });
  return {
    view: setViewing,
    step: setStep,
    resend: (row) =>
      resend.mutate(row.exit_id, { onSuccess: () => addToast({ title: 'NOC sent again', variant: 'success' }), onError: failed('Could not resend the NOC') }),
    download: (row) => void downloadNoc(row.exit_id, unitLabelOf(row)).catch(failed('Could not download the NOC')),
  };
}

/**
 * Move In/Out Tracker › NOC Initiated · NOC Sent · NOC Submitted (MOVE-18,
 * screen MOVE-S11): move-outs in progress by state, with block links, a
 * search and the export strip; Start Move-Out for any current owner or
 * tenant. Each list says "not available yet" until the API is deployed.
 */
export function NocContent({ state }: { state: MoveOutState }): ReactNode {
  const [block, setBlock] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [viewing, setViewing] = useState<MoveOut | null>(null);
  const [step, setStep] = useState<NocStep | null>(null);
  const [starting, setStarting] = useState(false);
  const query = useMoveOuts({ state, block, q: q || undefined, page, limit: pageSize });
  const handlers = useNocHandlers(setViewing, setStep);
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  const title = STATE_TITLES[state];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <UnitBlockLinks
          value={block}
          onChange={(next) => {
            setBlock(next);
            setPage(1);
          }}
        />
        {canTickChecklists() && (
          <Button type="button" onClick={() => setStarting(true)}>
            Start Move-Out
          </Button>
        )}
      </div>
      <DataTable<MoveOut>
        title={title}
        columns={MOVE_OUT_COLUMNS}
        actions={nocActions(state, handlers)}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.exit_id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: q, onChange: onSearch, placeholder: 'Name or unit' }}
        export={query.data ? { path: '/tenant-lifecycle/move-outs/export', params: moveOutParams({ state, block, q: q || undefined }), filename: `noc-${state}` } : undefined}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText={query.data === null ? NOT_AVAILABLE : 'No move-outs in progress.'}
      />
      <NocViewDialog row={viewing} onClose={() => setViewing(null)} />
      <NocStepDialog step={step} onClose={() => setStep(null)} />
      <StartMoveOutDialog open={starting} onClose={() => setStarting(false)} />
    </div>
  );
}
