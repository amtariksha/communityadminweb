'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, Users, Search, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useVendors, useVendor, useCreateVendor, useDeactivateVendor } from '@/hooks';

const ITEMS_PER_PAGE = 20;

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20 text-right" /></TableCell>
          <TableCell><Skeleton className="h-8 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function VendorsContent(): ReactNode {
  const { addToast } = useToast();
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const vendorsQuery = useVendors({
    search: searchQuery || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const vendorDetailQuery = useVendor(selectedVendorId);
  const createVendor = useCreateVendor();
  const deactivateVendor = useDeactivateVendor();

  const vendors = vendorsQuery.data?.data ?? [];
  const totalVendors = vendorsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalVendors / ITEMS_PER_PAGE));
  const vendorDetail = vendorDetailQuery.data;

  function resetForm(): void {
    setFormName('');
    setFormPan('');
    setFormGstin('');
    setFormBankName('');
    setFormBankAccount('');
    setFormBankIfsc('');
    setFormPhone('');
    setFormEmail('');
  }

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setPage(1);
  }

  function handleAddVendor(e: FormEvent): void {
    e.preventDefault();
    createVendor.mutate(
      {
        name: formName,
        pan: formPan || null,
        gstin: formGstin || null,
        bank_name: formBankName || null,
        bank_account_number: formBankAccount || null,
        bank_ifsc: formBankIfsc || null,
        phone: formPhone || null,
        email: formEmail || null,
      },
      {
        onSuccess() {
          setVendorDialogOpen(false);
          resetForm();
          addToast({ title: 'Vendor added successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to add vendor', variant: 'destructive' });
        },
      },
    );
  }

  function handleDeactivateVendor(id: string): void {
    deactivateVendor.mutate(id, {
      onSuccess() {
        setDetailDialogOpen(false);
        setSelectedVendorId('');
        addToast({ title: 'Vendor deactivated', variant: 'success' });
      },
      onError() {
        addToast({ title: 'Failed to deactivate vendor', variant: 'destructive' });
      },
    });
  }

  function handleRowClick(vendorId: string): void {
    setSelectedVendorId(vendorId);
    setDetailDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Vendors' }]}
        title="Vendors"
        description="Manage society vendors and suppliers — contact info, bank details, TDS"
        actions={
          <>
            <ExportButton
              data={vendors as unknown as Record<string, unknown>[]}
              filename={`vendors-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'name', label: 'Vendor Name' },
                { key: 'pan', label: 'PAN' },
                { key: 'gstin', label: 'GSTIN' },
                { key: 'phone', label: 'Phone' },
                { key: 'email', label: 'Email' },
              ]}
            />
            <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddVendor}>
                <DialogHeader>
                  <DialogTitle>Add Vendor</DialogTitle>
                  <DialogDescription>Add a new vendor or service provider</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor-name">Vendor Name</Label>
                    <Input
                      id="vendor-name"
                      placeholder="e.g., ABC Services"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendor-pan">PAN</Label>
                      <Input
                        id="vendor-pan"
                        placeholder="AAAAA1234A"
                        maxLength={10}
                        pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                        title="PAN must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)"
                        style={{ textTransform: 'uppercase' }}
                        value={formPan}
                        onChange={(e) => setFormPan(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor-gstin">GSTIN</Label>
                      <Input
                        id="vendor-gstin"
                        placeholder="Optional"
                        value={formGstin}
                        onChange={(e) => setFormGstin(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Details</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Bank Name"
                        value={formBankName}
                        onChange={(e) => setFormBankName(e.target.value)}
                      />
                      <Input
                        placeholder="IFSC Code"
                        value={formBankIfsc}
                        onChange={(e) => setFormBankIfsc(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Account Number"
                      value={formBankAccount}
                      onChange={(e) => setFormBankAccount(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendor-phone">Phone</Label>
                      <Input
                        id="vendor-phone"
                        type="tel"
                        placeholder="10-digit phone"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        inputMode="numeric"
                        title="Phone must be exactly 10 digits"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor-email">Email</Label>
                      <Input
                        id="vendor-email"
                        type="email"
                        placeholder="Email address"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createVendor.isPending}>
                    {createVendor.isPending ? 'Adding...' : 'Add Vendor'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorsQuery.isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold">{totalVendors}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendorsQuery.isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-2xl font-bold">
                {vendors.filter((v) => v.is_active).length}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Showing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendors.length}</p>
            <p className="text-xs text-muted-foreground">on this page</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Vendors</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, PAN, GSTIN..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Search
              </Button>
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
                <TableHead>Status</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorsQuery.isLoading ? (
                <TableSkeleton />
              ) : (
                vendors.map((vendor) => (
                  <TableRow
                    key={vendor.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(vendor.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        {vendor.contact_person && (
                          <p className="text-xs text-muted-foreground">{vendor.contact_person}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.pan ? (
                        <span className="font-mono text-xs">{vendor.pan}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.gstin ? (
                        <span className="font-mono text-xs">{vendor.gstin}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not registered</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vendor.phone ?? '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!vendorsQuery.isLoading && vendors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No vendors found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalVendors} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vendor Details</DialogTitle>
          </DialogHeader>
          {vendorDetailQuery.isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : vendorDetail ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{vendorDetail.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{vendorDetail.contact_person ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PAN</p>
                  <p className="font-mono text-sm">{vendorDetail.pan ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-mono text-sm">{vendorDetail.gstin ?? 'Not registered'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{vendorDetail.phone ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{vendorDetail.email ?? '-'}</p>
                </div>
              </div>
              {(vendorDetail.bank_name || vendorDetail.bank_account_number) && (
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">Bank Details</p>
                  <div className="rounded-md border p-3 text-sm">
                    <p>{vendorDetail.bank_name ?? '-'}</p>
                    <p className="font-mono">{vendorDetail.bank_account_number ?? '-'}</p>
                    <p>IFSC: {vendorDetail.bank_ifsc ?? '-'}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Badge variant={vendorDetail.is_active ? 'success' : 'secondary'}>
                  {vendorDetail.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {vendorDetail.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={deactivateVendor.isPending}
                    onClick={() => handleDeactivateVendor(vendorDetail.id)}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    {deactivateVendor.isPending ? 'Deactivating...' : 'Deactivate'}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
