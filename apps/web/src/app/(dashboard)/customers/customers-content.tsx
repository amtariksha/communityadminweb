'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Plus,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone } from '@/lib/validation';
import {
  ClickableEmail,
  ClickablePhone,
} from '@/components/ui/clickable-contact';
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeactivateCustomer,
} from '@/hooks';
import { ConvertToUnitDialog } from './convert-to-unit-dialog';

// ---------------------------------------------------------------------------
// Customers — non-resident parties the society raises invoices against
// (sponsors, external clubhouse renters, retainer-paying parties, etc.).
// AR-side mirror of the Vendors page; auto-creates a Sundry Debtors
// child ledger on create (see migration 070 + customer.service.ts).
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 20;

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-36" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20 text-right" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function CustomersContent(): ReactNode {
  const { addToast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  // Create form state — Phase D.4 added legal_name, state_code,
  // bank_branch for parity with the Vendor form and India invoicing
  // requirements (GSTR-1 needs state_code; B2B invoices want the
  // registered legal name distinct from the display name).
  const [formName, setFormName] = useState('');
  const [formLegalName, setFormLegalName] = useState('');
  const [formStateCode, setFormStateCode] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankBranch, setFormBankBranch] = useState('');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Edit form state — preloaded from the detail query when the
  // operator clicks Edit. Fields not in the list response (bank, etc.)
  // arrive on detail load; useEffect below syncs once data is ready.
  const [editName, setEditName] = useState('');
  const [editLegalName, setEditLegalName] = useState('');
  const [editStateCode, setEditStateCode] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editPan, setEditPan] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankBranch, setEditBankBranch] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editBankIfsc, setEditBankIfsc] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const customersQuery = useCustomers({
    search: searchQuery || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const detailQuery = useCustomer(selectedId);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deactivateCustomer = useDeactivateCustomer();

  const customers = customersQuery.data?.data ?? [];
  const total = customersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const detail = detailQuery.data;

  // Hydrate the edit form once the detail response is in. Without this
  // the bank/notes fields stay blank because the list endpoint only
  // returns headline fields.
  useEffect(() => {
    if (editDialogOpen && detail) {
      setEditName(detail.name);
      setEditLegalName(detail.legal_name ?? '');
      setEditStateCode(detail.state_code ?? '');
      setEditContactPerson(detail.contact_person ?? '');
      setEditPhone(detail.phone ?? '');
      setEditEmail(detail.email ?? '');
      setEditGstin(detail.gstin ?? '');
      setEditPan(detail.pan ?? '');
      setEditAddress(detail.address ?? '');
      setEditBankName(detail.bank_name ?? '');
      setEditBankBranch(detail.bank_branch ?? '');
      setEditBankAccount(detail.bank_account_number ?? '');
      setEditBankIfsc(detail.bank_ifsc ?? '');
      setEditNotes(detail.notes ?? '');
    }
  }, [editDialogOpen, detail]);

  function resetCreateForm(): void {
    setFormName('');
    setFormLegalName('');
    setFormStateCode('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormGstin('');
    setFormPan('');
    setFormAddress('');
    setFormBankName('');
    setFormBankBranch('');
    setFormBankAccount('');
    setFormBankIfsc('');
    setFormNotes('');
  }

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setPage(1);
  }

  function handleCreate(e: FormEvent): void {
    e.preventDefault();

    // Phone is optional, but if present must be a real Indian mobile
    // — otherwise we end up with 0000000000 in the customer's contact
    // and no one can reach them.
    const phone = normalizePhone(formPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid phone number',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }

    createCustomer.mutate(
      {
        name: formName,
        legal_name: formLegalName || null,
        state_code: formStateCode || null,
        contact_person: formContactPerson || null,
        phone: phone.value || null,
        email: formEmail || null,
        gstin: formGstin || null,
        pan: formPan || null,
        address: formAddress || null,
        bank_name: formBankName || null,
        bank_branch: formBankBranch || null,
        bank_account_number: formBankAccount || null,
        bank_ifsc: formBankIfsc || null,
        notes: formNotes || null,
      },
      {
        onSuccess() {
          setCreateDialogOpen(false);
          resetCreateForm();
          addToast({
            title: 'Customer added successfully',
            variant: 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to add customer',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleEdit(e: FormEvent): void {
    e.preventDefault();
    if (!selectedId) return;

    const phone = normalizePhone(editPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid phone number',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }

    updateCustomer.mutate(
      {
        id: selectedId,
        data: {
          name: editName,
          legal_name: editLegalName || null,
          state_code: editStateCode || null,
          contact_person: editContactPerson || null,
          phone: phone.value || null,
          email: editEmail || null,
          gstin: editGstin || null,
          pan: editPan || null,
          address: editAddress || null,
          bank_name: editBankName || null,
          bank_branch: editBankBranch || null,
          bank_account_number: editBankAccount || null,
          bank_ifsc: editBankIfsc || null,
          notes: editNotes || null,
        },
      },
      {
        onSuccess() {
          setEditDialogOpen(false);
          addToast({ title: 'Customer updated', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: 'Failed to update customer',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleDeactivate(): void {
    if (!selectedId) return;
    if (
      !confirm(
        'Deactivate this customer? They will be hidden from new invoice flows but existing invoices stay intact.',
      )
    )
      return;

    deactivateCustomer.mutate(selectedId, {
      onSuccess() {
        setDetailDialogOpen(false);
        setSelectedId('');
        addToast({ title: 'Customer deactivated', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to deactivate',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  function handleRowClick(id: string): void {
    setSelectedId(id);
    setDetailDialogOpen(true);
  }

  function openEditDialog(): void {
    setDetailDialogOpen(false);
    setEditDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Customers' }]}
        title="Customers"
        description="Non-resident parties the society raises invoices against — sponsors, external clubhouse renters, retainers"
        actions={
          <Button
            onClick={() => {
              resetCreateForm();
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All customers
            <Badge variant="outline" className="ml-2">
              {total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by name, GSTIN, or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersQuery.isLoading ? (
                <TableSkeleton />
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    {searchQuery
                      ? 'No customers match your search.'
                      : 'No customers yet. Add your first one to start raising custom invoices.'}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(c.id)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="space-y-0.5 text-sm">
                      {c.phone && <ClickablePhone phone={c.phone} />}
                      {c.email && <ClickableEmail email={c.email} />}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.gstin ?? '—'}
                    </TableCell>
                    <TableCell>
                      {c.is_active ? (
                        <Badge variant="outline">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add customer</DialogTitle>
              <DialogDescription>
                A Sundry Debtors ledger will be auto-created and linked to
                this customer for invoicing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cust-name">
                  Display name *{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (shown in dropdowns + reports)
                  </span>
                </Label>
                <Input
                  id="cust-name"
                  required
                  maxLength={255}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cust-legal-name">
                  Legal name{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (registered entity name — used on invoice PDFs)
                  </span>
                </Label>
                <Input
                  id="cust-legal-name"
                  maxLength={255}
                  placeholder="e.g. Acme Properties Pvt Ltd"
                  value={formLegalName}
                  onChange={(e) => setFormLegalName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-contact">Contact person</Label>
                <Input
                  id="cust-contact"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-phone">Phone</Label>
                <Input
                  id="cust-phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cust-email">Email</Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-gstin">GSTIN</Label>
                <Input
                  id="cust-gstin"
                  value={formGstin}
                  onChange={(e) =>
                    setFormGstin(e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-pan">PAN</Label>
                <Input
                  id="cust-pan"
                  value={formPan}
                  onChange={(e) => setFormPan(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-state">
                  State code{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (2-digit GST code)
                  </span>
                </Label>
                <Input
                  id="cust-state"
                  maxLength={2}
                  placeholder="e.g. 29 (Karnataka), 27 (Maharashtra)"
                  value={formStateCode}
                  onChange={(e) =>
                    setFormStateCode(e.target.value.replace(/\D/g, '').slice(0, 2))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-address">Address</Label>
                <Input
                  id="cust-address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-bank-name">Bank name</Label>
                <Input
                  id="cust-bank-name"
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-bank-branch">Branch</Label>
                <Input
                  id="cust-bank-branch"
                  value={formBankBranch}
                  onChange={(e) => setFormBankBranch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-bank-acc">Account number</Label>
                <Input
                  id="cust-bank-acc"
                  value={formBankAccount}
                  onChange={(e) => setFormBankAccount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cust-bank-ifsc">IFSC</Label>
                <Input
                  id="cust-bank-ifsc"
                  value={formBankIfsc}
                  onChange={(e) =>
                    setFormBankIfsc(e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cust-notes">Notes</Label>
                <Input
                  id="cust-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? 'Saving…' : 'Add customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.name ?? 'Customer'}</DialogTitle>
            <DialogDescription>
              {detail?.is_active ? 'Active customer' : 'Inactive customer'}
            </DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-5 w-56" />
            </div>
          ) : detail ? (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <span className="text-muted-foreground">Contact:</span>{' '}
                  {detail.contact_person ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  {detail.phone ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  {detail.email ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">GSTIN:</span>{' '}
                  {detail.gstin ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">PAN:</span>{' '}
                  {detail.pan ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Address:</span>{' '}
                  {detail.address ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Bank:</span>{' '}
                  {detail.bank_name ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">A/C:</span>{' '}
                  {detail.bank_account_number ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">IFSC:</span>{' '}
                  {detail.bank_ifsc ?? '—'}
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 p-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Outstanding
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(detail.total_outstanding)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Total invoices
                    </div>
                    <div className="font-semibold">
                      {detail.total_invoices}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Pending
                    </div>
                    <div className="font-semibold">
                      {detail.pending_invoices}
                    </div>
                  </div>
                </div>
              </div>

              {detail.ledger_account_id && (
                <Link
                  href={`/accounts?account=${detail.ledger_account_id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View ledger (Sundry Debtors → {detail.name})
                </Link>
              )}

              {detail.notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="mb-1 text-muted-foreground">Notes</div>
                  {detail.notes}
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              No data available.
            </p>
          )}
          <DialogFooter className="flex justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeactivate}
                disabled={!detail?.is_active || deactivateCustomer.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Deactivate
              </Button>
              {/* Phase C.3 — Tally migration helper. Hidden when the
                  customer has no balance OR is already inactive. */}
              {detail?.is_active && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    setConvertOpen(true);
                  }}
                >
                  Convert to unit
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose>
                <Button variant="outline">Close</Button>
              </DialogClose>
              <Button onClick={openEditDialog}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert-to-unit dialog (Phase C.3 Tally migration helper) */}
      {detail && (
        <ConvertToUnitDialog
          customerId={detail.id}
          customerName={detail.name}
          customerOutstanding={detail.total_outstanding}
          open={convertOpen}
          onOpenChange={setConvertOpen}
          onConverted={() => {
            setSelectedId('');
          }}
        />
      )}

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit customer</DialogTitle>
              <DialogDescription>
                Updating the customer name will rename the linked Sundry
                Debtors ledger to match.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-name">Display name *</Label>
                <Input
                  id="edit-name"
                  required
                  maxLength={255}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-legal-name">Legal name</Label>
                <Input
                  id="edit-legal-name"
                  maxLength={255}
                  placeholder="Registered entity name (used on invoice PDFs)"
                  value={editLegalName}
                  onChange={(e) => setEditLegalName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Contact person</Label>
                <Input
                  id="edit-contact"
                  value={editContactPerson}
                  onChange={(e) => setEditContactPerson(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gstin">GSTIN</Label>
                <Input
                  id="edit-gstin"
                  value={editGstin}
                  onChange={(e) =>
                    setEditGstin(e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pan">PAN</Label>
                <Input
                  id="edit-pan"
                  value={editPan}
                  onChange={(e) => setEditPan(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">
                  State code{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (2-digit)
                  </span>
                </Label>
                <Input
                  id="edit-state"
                  maxLength={2}
                  value={editStateCode}
                  onChange={(e) =>
                    setEditStateCode(e.target.value.replace(/\D/g, '').slice(0, 2))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bank-name">Bank name</Label>
                <Input
                  id="edit-bank-name"
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bank-branch">Branch</Label>
                <Input
                  id="edit-bank-branch"
                  value={editBankBranch}
                  onChange={(e) => setEditBankBranch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bank-acc">Account number</Label>
                <Input
                  id="edit-bank-acc"
                  value={editBankAccount}
                  onChange={(e) => setEditBankAccount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bank-ifsc">IFSC</Label>
                <Input
                  id="edit-bank-ifsc"
                  value={editBankIfsc}
                  onChange={(e) =>
                    setEditBankIfsc(e.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={updateCustomer.isPending}>
                {updateCustomer.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
