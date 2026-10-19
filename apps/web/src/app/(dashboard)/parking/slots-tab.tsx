'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, Search, UserMinus, UserPlus, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportStrip } from '@/components/data-table/export-strip';
import { printableTable, toTsv } from '@/components/data-table/table-text';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { slotFiltersToParams, useDeallocateSlot, useSlotPage } from '@/hooks/use-parking';
import type { ParkingSlot } from '@/hooks/use-parking';
import { AddSlotDialog, AssignSlotDialog } from './slot-dialogs';
import {
  ListPager,
  PARKING_PAGE_SIZE,
  SLOT_TEXT_COLUMNS,
  SLOT_TYPES,
  slotStatusVariant,
  slotTypeIcon,
  typeLabel,
} from './parking-ui';

const COLUMN_COUNT = 8;

function SlotRow({ slot, onAssign, onDeallocate }: { slot: ParkingSlot; onAssign: () => void; onDeallocate: () => void }): ReactNode {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{slot.slot_number}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {slotTypeIcon(slot.slot_type)}
          <span>{typeLabel(slot.slot_type)}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{slot.location ?? '-'}</TableCell>
      <TableCell>{slot.unit_number ?? '-'}</TableCell>
      <TableCell>{slot.member_name ?? '-'}</TableCell>
      <TableCell>{slot.has_ev_charger ? <Zap className="h-4 w-4 text-blue-500" /> : <span className="text-muted-foreground">-</span>}</TableCell>
      <TableCell>
        <Badge variant={slotStatusVariant(slot.status)}>{slot.status}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {slot.status === 'vacant' && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onAssign} title="Assign to unit">
              <UserPlus className="h-4 w-4 text-green-500" />
            </Button>
          )}
          {slot.status === 'assigned' && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDeallocate} title="Deallocate">
              <UserMinus className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function SlotTableBody({ slots, loading, onAssign, onDeallocate }: {
  slots: ParkingSlot[];
  loading: boolean;
  onAssign: (slot: ParkingSlot) => void;
  onDeallocate: (slot: ParkingSlot) => void;
}): ReactNode {
  if (loading) {
    return Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: COLUMN_COUNT }).map((__, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
        ))}
      </TableRow>
    ));
  }
  if (slots.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
          No parking slots found. Add slots to start managing parking.
        </TableCell>
      </TableRow>
    );
  }
  return slots.map((slot) => (
    <SlotRow key={slot.id} slot={slot} onAssign={() => onAssign(slot)} onDeallocate={() => onDeallocate(slot)} />
  ));
}

/** Parking › Slots: paged, searchable, filterable, exported whole (PARK-02, PARK-04). */
export function SlotsTab(): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState<ParkingSlot | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PARKING_PAGE_SIZE);
  const deallocateMutation = useDeallocateSlot();

  const filters = { slot_type: typeFilter || undefined, search: search || undefined };
  const slotsQuery = useSlotPage({ ...filters, page, limit: pageSize });
  const slots = slotsQuery.data?.data ?? [];

  function submitSearch(event: FormEvent): void {
    event.preventDefault();
    setSearch(searchText.trim());
    setPage(1);
  }

  function handleDeallocate(slot: ParkingSlot): void {
    deallocateMutation.mutate(slot.id, {
      onSuccess: () => addToast({ title: `Slot ${slot.slot_number} deallocated`, variant: 'success' }),
      onError: (error) => addToast({ title: 'Failed to deallocate', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Parking Slots</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={submitSearch} className="flex items-center gap-2" role="search">
              <Input aria-label="Search slots" placeholder="Slot number or location" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-56" />
              <Button type="submit" variant="outline" size="sm"><Search className="mr-1 h-4 w-4" />Search</Button>
            </form>
            <Select aria-label="Slot type" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {SLOT_TYPES.map((t) => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Slot
            </Button>
          </div>
        </div>
        <ExportStrip
          config={{ path: '/parking/slots/export', params: slotFiltersToParams(filters) ?? {}, filename: 'parking-slots' }}
          copyText={() => toTsv(SLOT_TEXT_COLUMNS, slots)}
          printPage={() => printableTable('Parking Slots', SLOT_TEXT_COLUMNS, slots)}
          rowCount={slots.length}
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slot #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>EV Charger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SlotTableBody slots={slots} loading={slotsQuery.isLoading} onAssign={setAssigning} onDeallocate={handleDeallocate} />
          </TableBody>
        </Table>
        <ListPager
          page={page}
          pageSize={pageSize}
          total={slotsQuery.data?.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </CardContent>
      <AddSlotDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AssignSlotDialog slot={assigning} onClose={() => setAssigning(null)} />
    </Card>
  );
}
