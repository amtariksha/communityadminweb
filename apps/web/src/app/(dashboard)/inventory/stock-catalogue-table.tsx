'use client';

import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DataTablePager } from '@/components/data-table/data-table-pager';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useMaterialList, type MaterialListRow } from '@/hooks/use-inventory-list';
import { formatCurrency } from '@/lib/utils';

export const CATALOGUE_PAGE_SIZE = 25;

/** Quantity × cost per unit, from the API when it sends it. */
export function stockValue(row: MaterialListRow): number {
  return row.total_cost !== undefined ? Number(row.total_cost) : Number(row.current_stock) * Number(row.unit_price);
}

function CatalogueRow({ m }: { m: MaterialListRow }): ReactNode {
  const isLow = Number(m.current_stock) <= Number(m.minimum_stock);
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{m.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{m.item_code}</div>
      </TableCell>
      <TableCell><Badge variant="outline">{m.category}</Badge></TableCell>
      <TableCell className="font-semibold">{m.current_stock} {m.unit}</TableCell>
      <TableCell className="text-muted-foreground">{m.minimum_stock} {m.unit}</TableCell>
      <TableCell>{formatCurrency(m.unit_price)}</TableCell>
      <TableCell>{formatCurrency(stockValue(m))}</TableCell>
      <TableCell>{m.location || '—'}</TableCell>
      <TableCell className="text-right">
        {isLow ? (
          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Low Stock</Badge>
        ) : (
          <Badge variant="success">Normal</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

/**
 * The standard Stock Catalogue (ASSET-09): searched on the server (name,
 * item code), a page at a time, with the Total Cost of each item.
 */
export function StockCatalogueTable(): ReactNode {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState('');
  const search = useDebouncedValue(draft.trim(), 300);
  const [searched, setSearched] = useState(search);
  if (searched !== search) {
    setSearched(search);
    setPage(1);
  }
  const query = useMaterialList({ search: search || undefined, page, limit: CATALOGUE_PAGE_SIZE });
  const rows = query.data?.data ?? [];
  // An API older than ASSET-09 sends every item without a total.
  const legacy = query.data !== undefined && query.data.total === undefined;
  const shown = legacy ? rows.slice((page - 1) * CATALOGUE_PAGE_SIZE, page * CATALOGUE_PAGE_SIZE) : rows;
  const total = legacy ? rows.length : (query.data?.total ?? 0);

  return (
    <div className="space-y-3">
      <Input
        type="search"
        aria-label="Search materials"
        placeholder="Name or item code"
        className="w-64"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      {query.isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading stock catalogue...</div>
      ) : shown.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {search ? 'No material matches.' : 'No materials registered. Click "Add Material".'}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code & Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Threshold</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((m) => <CatalogueRow key={m.id} m={m} />)}
            </TableBody>
          </Table>
          <DataTablePager page={page} pageSize={CATALOGUE_PAGE_SIZE} total={total} pageSizeOptions={[CATALOGUE_PAGE_SIZE]} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
