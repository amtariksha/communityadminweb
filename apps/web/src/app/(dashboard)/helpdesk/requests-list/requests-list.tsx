'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableAction } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { useRouteStatus } from '@/components/layout/menu/use-route-status';
import { ticketListParams, useTicketFacets, useTickets, type Ticket, type TicketFilters } from '@/hooks';
import { HELPDESK_BASE, HELPDESK_SCOPES, type HelpdeskScope } from '@/lib/helpdesk-scopes';
import { useAdminLayout } from '@/lib/layout-context';
import { useWord } from '@/lib/vocabulary';
import { TicketDetailDialog } from '../../tickets/ticket-detail-dialog';
import { requestColumns } from './request-columns';
import { NO_REQUEST_FILTERS, RequestFilters, type RequestFilterValues } from './request-filters';

// Their lists show 100 rows a page (HELP-S7).
const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 100;

function listFilters(scope: HelpdeskScope, values: RequestFilterValues, q: string): TicketFilters {
  return {
    scope: scope.slug,
    q: q || undefined,
    status: values.status || undefined,
    category_id: values.category_id || undefined,
    assigned_to: values.assigned_to || undefined,
    block: values.block || undefined,
    unit_id: values.unit_id || undefined,
    type: values.type === 'personal' || values.type === 'community' ? values.type : undefined,
    subcategory_id: values.subcategory_id || undefined,
  };
}

/** `?view=<id>` opens a request (Create Request lands here after saving). */
function useViewedRequest(): [string, (id: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const linked = searchParams.get('view') ?? '';
  const [viewing, setViewing] = useState(linked);
  const view = useCallback(
    (id: string) => {
      setViewing(id);
      if (!id && linked) router.replace(pathname);
    },
    [linked, router, pathname],
  );
  return [viewing, view];
}

function ScopeList({ scope }: { scope: HelpdeskScope }): ReactNode {
  const layout = useAdminLayout();
  const word = useWord();
  const [values, setValues] = useState<RequestFilterValues>(NO_REQUEST_FILTERS);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewing, view] = useViewedRequest();

  const filters = listFilters(scope, values, q);
  const ticketsQuery = useTickets({ ...filters, page, limit: pageSize });
  const facetsQuery = useTicketFacets(scope.slug);
  const columns = useMemo(() => requestColumns(layout, word), [layout, word]);
  const actions: DataTableAction<Ticket>[] = [
    { key: 'view', header: 'Action', label: 'View', onClick: (row) => view(row.id) },
  ];
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      {layout === 'standard' && <PageHeader title={scope.label} />}
      <DataTable<Ticket>
        title={scope.label}
        columns={columns}
        actions={actions}
        rows={ticketsQuery.data?.data ?? []}
        rowKey={(row) => row.id}
        total={ticketsQuery.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: q, onChange: onSearch, placeholder: 'Request no., request, unit or name' }}
        filters={
          <RequestFilters
            scope={scope}
            layout={layout}
            facets={facetsQuery.data}
            values={values}
            onChange={(next) => {
              setValues(next);
              setPage(1);
            }}
          />
        }
        export={{
          path: '/tickets/export',
          params: { ...ticketListParams(filters), layout },
          filename: `${scope.slug}-requests`,
        }}
        loading={ticketsQuery.isLoading}
        error={ticketsQuery.isError ? ticketsQuery.error : undefined}
        onRetry={() => void ticketsQuery.refetch()}
        emptyText={scope.emptyText}
      />
      <TicketDetailDialog ticketId={viewing} onClose={() => view('')} />
    </div>
  );
}

/**
 * Open Requests or Closed Requests, whichever the route names (SB-05):
 * /helpdesk/open and /helpdesk/closed render this same list.
 */
export function RequestsList(): ReactNode {
  const scope = useRouteStatus(HELPDESK_BASE, HELPDESK_SCOPES);
  if (!scope) return null;
  // A new key per scope starts each list with its own filters and page.
  return <ScopeList key={scope.slug} scope={scope} />;
}
