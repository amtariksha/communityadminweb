'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialItem, useMaterialMovements, type StockMovement } from '@/hooks/use-inventory-list';
import { currentRole } from '@/lib/current-role';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreatePoDialog } from '../../../inventory/create-po-dialog';
import { EditMaterialDialog } from '../../../inventory/edit-material-dialog';
import { poPrefill } from '../../../inventory/material-form';
import { StockMovementDialog } from '../../../inventory/stock-movement-dialog';
import { INVENTORY_BASE, INVENTORY_WRITE_ROLES } from '../inventory-list';
import { ExpireButton } from './expire-button';

function Field({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function History({ rows }: { rows: readonly StockMovement[] }): ReactNode {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No movements yet.</p>;
  return (
    <Table aria-label="Movements">
      <TableHeader>
        <TableRow>
          {['S.No', 'Date', 'Movement', 'Quantity', 'Balance After', 'Reference', 'Notes', 'By'].map((heading) => (
            <TableHead key={heading}>{heading}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{formatDate(row.log_date)}</TableCell>
            <TableCell>{row.movement_type === 'IN' ? 'Add' : 'Remove'}</TableCell>
            <TableCell>{Number(row.quantity)}</TableCell>
            <TableCell>{Number(row.balance)}</TableCell>
            <TableCell>{row.reference_id ?? ''}</TableCell>
            <TableCell>{row.notes ?? ''}</TableCell>
            <TableCell>{row.created_by_name ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type Dialogs = 'move' | 'edit' | 'po' | null;

/**
 * Inventory › More details (ASSET-S12): the item with Edit (ASSET-11),
 * Add/Remove, Create PO from its vendor and re-order quantity, Mark Expired
 * / Re-activate (ASSET-12), and its movement history within From · To.
 * Movements are never edited; a wrong one is corrected by the opposite
 * movement.
 */
export function InventoryItem(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState<Dialogs>(null);
  const query = useMaterialItem(id);
  const item = query.data;
  const history = useMaterialMovements(id, { from: from || undefined, to: to || undefined });
  const canWrite = INVENTORY_WRITE_ROLES.has(currentRole() ?? '');

  if (query.isLoading) return <Skeleton className="h-48 w-full" />;
  if (!item) return <p className="text-sm text-muted-foreground">This item was not found.</p>;
  const expired = item.is_active === false;
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <div className="flex flex-wrap gap-2">
            <ShowLogsButton recordTypes={['material', 'stock_movement']} recordId={item.id} />
            {canWrite && <Button variant="outline" onClick={() => setOpen('edit')}>Edit</Button>}
            {canWrite && !expired && <Button onClick={() => setOpen('move')}>Add/Remove</Button>}
            {canWrite && !expired && <Button variant="outline" onClick={() => setOpen('po')}>Create PO</Button>}
            {canWrite && <ExpireButton item={item} />}
            <Link href={`${INVENTORY_BASE}/${expired ? 'expired' : 'active'}`} className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
              Back
            </Link>
          </div>
        </div>
        {expired && (
          <p className="text-sm text-destructive">Expired{item.expired_at ? ` on ${formatDate(item.expired_at)}` : ''}; it takes no Add / Remove until re-activated.</p>
        )}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Item Code" value={item.item_code} />
          <Field label="Category" value={item.category} />
          <Field label="Quantity" value={`${Number(item.current_stock)} ${item.unit}`} />
          <Field label="Cost per unit" value={formatCurrency(Number(item.unit_price))} />
          <Field label="Total Cost" value={formatCurrency(Number(item.current_stock) * Number(item.unit_price))} />
          <Field label="Reorder Level" value={Number(item.minimum_stock)} />
          <Field label="Reorder Quantity" value={item.reorder_quantity == null ? '—' : Number(item.reorder_quantity)} />
          <Field label="Vendor" value={item.vendor_name || '—'} />
          <Field label="Location" value={item.location || '—'} />
        </dl>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="history-from">From</Label>
            <Input id="history-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="history-to">To</Label>
            <Input id="history-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {history.isLoading ? <Skeleton className="h-24 w-full" /> : <History rows={history.data ?? []} />}
      </CardContent>
      {open === 'move' && <StockMovementDialog material={item} onClose={() => setOpen(null)} />}
      {open === 'edit' && <EditMaterialDialog item={item} onClose={() => setOpen(null)} />}
      {open === 'po' && <CreatePoDialog open onOpenChange={(next) => !next && setOpen(null)} prefill={poPrefill(item)} />}
    </Card>
  );
}
