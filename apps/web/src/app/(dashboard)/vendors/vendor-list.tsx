'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search, Users, XCircle } from 'lucide-react';
import type { Vendor } from '@communityos/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClickablePhone } from '@/components/ui/clickable-contact';
import { ExportButton } from '@/components/ui/export-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVendors } from '@/hooks';
import { tdsText } from './vendor-form';

const ITEMS_PER_PAGE = 20;

export type VendorStatusFilter = 'all' | 'active' | 'inactive';

const IS_ACTIVE: Readonly<Record<VendorStatusFilter, boolean | undefined>> = {
  all: undefined,
  active: true,
  inactive: false,
};

interface VendorListProps {
  onOpen: (vendorId: string) => void;
  onEdit: (vendorId: string) => void;
  onDeactivate: (vendorId: string) => void;
  deactivating: boolean;
}

/** A count from the API's total, not from the rows on this page (VEND-02). */
function CountTile({ title, isActive }: { title: string; isActive?: boolean }): ReactNode {
  const query = useVendors({ is_active: isActive, page: 1, limit: 1 });
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{query.data?.total ?? '—'}</p>}
      </CardContent>
    </Card>
  );
}

function VendorRow({ vendor, props }: { vendor: Vendor; props: VendorListProps }): ReactNode {
  return (
    <TableRow className="cursor-pointer" onClick={() => props.onOpen(vendor.id)}>
      <TableCell>
        <p className="font-medium">{vendor.name}</p>
        {vendor.contact_person && <p className="text-xs text-muted-foreground">{vendor.contact_person}</p>}
        {/* EXP-15: the vendor's account statement. */}
        <Link
          className="text-xs text-primary underline"
          href={`/expense-tracker/by-vendors/${vendor.id}/statement?tab=full`}
          onClick={(e) => e.stopPropagation()}
        >
          Account statement
        </Link>
      </TableCell>
      <TableCell>{vendor.pan ? <span className="font-mono text-xs">{vendor.pan}</span> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
      <TableCell>
        {vendor.gstin ? <span className="font-mono text-xs">{vendor.gstin}</span> : <span className="text-xs text-muted-foreground">Not registered</span>}
      </TableCell>
      <TableCell className="text-xs">{tdsText(vendor)}</TableCell>
      <TableCell>{vendor.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
      <TableCell><ClickablePhone phone={vendor.phone} /></TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit vendor" onClick={(e) => { e.stopPropagation(); props.onEdit(vendor.id); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          {vendor.is_active && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive"
              title="Deactivate vendor"
              disabled={props.deactivating}
              onClick={(e) => { e.stopPropagation(); props.onDeactivate(vendor.id); }}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }): ReactNode {
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SearchBar({ onSearch }: { onSearch: (query: string) => void }): ReactNode {
  const [input, setInput] = useState('');
  return (
    <div className="flex gap-2">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, PAN, GSTIN..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(input); }}
          className="pl-9"
        />
      </div>
      <Button variant="outline" size="sm" onClick={() => onSearch(input)}>Search</Button>
    </div>
  );
}

export function VendorList(props: VendorListProps): ReactNode {
  const [status, setStatus] = useState<VendorStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useVendors({ search: search || undefined, is_active: IS_ACTIVE[status], page, limit: ITEMS_PER_PAGE });
  const vendors = query.data?.data ?? [];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <CountTile title="Total Vendors" />
        <CountTile title="Active Vendors" isActive />
        <CountTile title="In-Active Vendors" isActive={false} />
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Vendors</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as VendorStatusFilter); setPage(1); }}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">In-Active</option>
              </Select>
              <SearchBar onSearch={(value) => { setSearch(value); setPage(1); }} />
              <ExportButton
                data={vendors as unknown as Record<string, unknown>[]}
                filename={`vendors-${new Date().toISOString().split('T')[0]}`}
                columns={[
                  { key: 'name', label: 'Vendor Name' },
                  { key: 'contact_person', label: 'Contact Name' },
                  { key: 'pan', label: 'PAN' },
                  { key: 'gstin', label: 'GSTIN' },
                  { key: 'tds_section', label: 'TDS Section' },
                  { key: 'tds_rate', label: 'TDS Rate %' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'email', label: 'Email' },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>TDS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                : vendors.map((vendor) => <VendorRow key={vendor.id} vendor={vendor} props={props} />)}
            </TableBody>
          </Table>
          {!query.isLoading && vendors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">{status === 'inactive' ? 'No in-active vendors' : 'No vendors found'}</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or status filter</p>
            </div>
          )}
          <Pager page={page} total={query.data?.total ?? 0} onPage={setPage} />
        </CardContent>
      </Card>
    </>
  );
}
