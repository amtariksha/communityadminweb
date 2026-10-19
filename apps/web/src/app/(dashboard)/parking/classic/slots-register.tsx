'use client';

import Link from 'next/link';
import { useCallback, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { buttonVariants } from '@/components/ui/button';
import { slotFiltersToParams, useSlotPage, type ParkingSlot } from '@/hooks/use-parking';
import { PARKING_PAGE_SIZES, typeLabel } from '../parking-ui';

/** Add Slot and Edit Slot are pages of their own in classic (PARK-07, SB-07). */
export const SLOT_FORM_ROUTES = {
  add: '/parking/slots/new',
  edit: (slotId: string) => `/parking/slots/${slotId}/edit`,
} as const;

// Their slot list: serial, slot number, type, and the row's action (PARK-S2).
const COLUMNS: DataTableColumn<ParkingSlot>[] = [
  { key: 'slot', header: 'Slot No', cell: (row) => row.slot_number, className: 'font-mono text-xs' },
  { key: 'type', header: 'Type', cell: (row) => typeLabel(row.slot_type) },
];

/**
 * Parking Manager › Slots (PARK-06, screen PARK-S2): the classic preset of
 * the slot register on the shared table — Sr No · Slot No · Type, a server
 * search over slot number and location, the export strip, Add Slot and
 * Edit as pages (PARK-07).
 */
export function SlotsRegister(): ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PARKING_PAGE_SIZES[0]);
  const filters = { search: search || undefined };
  const query = useSlotPage({ ...filters, page, limit: pageSize });
  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={SLOT_FORM_ROUTES.add} className={buttonVariants()} data-slot="button" data-size="default">
          <Plus className="mr-2 h-4 w-4" /> Add Slot
        </Link>
      </div>
      <DataTable<ParkingSlot>
        title="Parking Slots"
        serialHeader="Sr No"
        columns={COLUMNS}
        actions={[{ key: 'edit', header: 'Action', label: 'Edit', href: (row) => SLOT_FORM_ROUTES.edit(row.id) }]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PARKING_PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: search, onChange: onSearch, placeholder: 'Slot number or location' }}
        export={{ path: '/parking/slots/export', params: slotFiltersToParams(filters) ?? {}, filename: 'parking-slots' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No slots yet — Add Slot."
      />
    </div>
  );
}
