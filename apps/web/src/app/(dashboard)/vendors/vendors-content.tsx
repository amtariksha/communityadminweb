'use client';

import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { Plus, Users, Search, ChevronLeft, ChevronRight, XCircle, Pencil, Star, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserSearchSelect } from '@/components/ui/user-search-select';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { FormFieldError } from '@/components/ui/form-field-error';
import { normalizePhone } from '@/lib/validation';
import { useVendors, useVendor, useCreateVendor, useUpdateVendor, useDeactivateVendor, useServiceRatings, useTopRated, useVerifyRating } from '@/hooks';
import { ClickablePhone, ClickableEmail } from '@/components/ui/clickable-contact';
import type { ServiceRating, TopRatedProvider, RatingFilters } from '@/hooks/use-ratings';

const ITEMS_PER_PAGE = 20;

type VendorTab = 'vendors' | 'ratings';

function StarRating({ rating }: { rating: number }): ReactNode {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<VendorTab>('vendors');
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  // Rating state
  const [ratingServiceFilter, setRatingServiceFilter] = useState('');
  const [ratingSearchInput, setRatingSearchInput] = useState('');
  const [ratingSearchQuery, setRatingSearchQuery] = useState('');
  const [ratingPage, setRatingPage] = useState(1);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPan, setFormPan] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formBankAccount, setFormBankAccount] = useState('');
  const [formBankIfsc, setFormBankIfsc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPan, setEditPan] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankAccount, setEditBankAccount] = useState('');
  const [editBankIfsc, setEditBankIfsc] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const vendorsQuery = useVendors({
    search: searchQuery || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const vendorDetailQuery = useVendor(selectedVendorId);
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deactivateVendor = useDeactivateVendor();

  const ratingFilters: RatingFilters = {
    service_type: ratingServiceFilter || undefined,
    search: ratingSearchQuery || undefined,
    page: ratingPage,
    limit: ITEMS_PER_PAGE,
  };
  const ratingsQuery = useServiceRatings(ratingFilters);
  const topRatedQuery = useTopRated();
  const verifyRating = useVerifyRating();

  const ratings: ServiceRating[] = ratingsQuery.data?.data ?? [];
  const totalRatings = ratingsQuery.data?.total ?? 0;
  const totalRatingPages = Math.max(1, Math.ceil(totalRatings / ITEMS_PER_PAGE));
  const topRated: TopRatedProvider[] = topRatedQuery.data ?? [];

  const vendors = vendorsQuery.data?.data ?? [];
  const totalVendors = vendorsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalVendors / ITEMS_PER_PAGE));
  const vendorDetail = vendorDetailQuery.data;

  // Sync edit form with full vendor detail when dialog is open and data loads
  // This ensures bank fields (absent from list data) are populated once detail arrives
  useEffect(() => {
    if (editDialogOpen && vendorDetail) {
      setEditName(vendorDetail.name);
      setEditPan(vendorDetail.pan ?? '');
      setEditGstin(vendorDetail.gstin ?? '');
      setEditBankName(vendorDetail.bank_name ?? '');
      setEditBankAccount(vendorDetail.bank_account_number ?? '');
      setEditBankIfsc(vendorDetail.bank_ifsc ?? '');
      setEditPhone(vendorDetail.phone ?? '');
      setEditEmail(vendorDetail.email ?? '');
    }
  }, [vendorDetail, editDialogOpen]);

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
    // Phone is optional on vendors, but if present it must pass the
    // Indian-mobile rule so we don't write 0000000000 / 1234567890 as
    // a vendor contact that no one can actually reach.
    const phone = normalizePhone(formPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid phone number',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }
    createVendor.mutate(
      {
        name: formName,
        pan: formPan || null,
        gstin: formGstin || null,
        bank_name: formBankName || null,
        bank_account_number: formBankAccount || null,
        bank_ifsc: formBankIfsc || null,
        phone: phone.value || null,
        email: formEmail || null,
      },
      {
        onSuccess() {
          setVendorDialogOpen(false);
          resetForm();
          addToast({ title: 'Vendor added successfully', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to add vendor', description: friendlyError(error), variant: 'destructive' });
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
      onError(error) {
        addToast({ title: 'Failed to deactivate vendor', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function openEditDialog(): void {
    if (!vendorDetail) return;
    setEditName(vendorDetail.name);
    setEditPan(vendorDetail.pan ?? '');
    setEditGstin(vendorDetail.gstin ?? '');
    setEditBankName(vendorDetail.bank_name ?? '');
    setEditBankAccount(vendorDetail.bank_account_number ?? '');
    setEditBankIfsc(vendorDetail.bank_ifsc ?? '');
    setEditPhone(vendorDetail.phone ?? '');
    setEditEmail(vendorDetail.email ?? '');
    setDetailDialogOpen(false);
    setEditDialogOpen(true);
  }

  function handleEditVendor(e: FormEvent): void {
    e.preventDefault();
    if (!selectedVendorId) return;

    const phone = normalizePhone(editPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid phone number',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }

    updateVendor.mutate(
      {
        id: selectedVendorId,
        data: {
          name: editName,
          pan: editPan || null,
          gstin: editGstin || null,
          bank_name: editBankName || null,
          bank_account_number: editBankAccount || null,
          bank_ifsc: editBankIfsc || null,
          phone: phone.value || null,
          email: editEmail || null,
        },
      },
      {
        onSuccess() {
          setEditDialogOpen(false);
          setSelectedVendorId('');
          addToast({ title: 'Vendor updated successfully', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to update vendor', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleRowClick(vendorId: string): void {
    setSelectedVendorId(vendorId);
    setDetailDialogOpen(true);
  }

  function handleVerifyRating(id: string): void {
    verifyRating.mutate(id, {
      onSuccess() {
        addToast({ title: 'Rating verified', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to verify rating', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function handleRatingSearch(): void {
    setRatingSearchQuery(ratingSearchInput);
    setRatingPage(1);
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  const tabs: { key: VendorTab; label: string }[] = [
    { key: 'vendors', label: 'Vendors' },
    { key: 'ratings', label: 'Ratings' },
  ];

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
                  {/* QA #250 — society members can also be vendors
                      (a resident running a plumbing business, a
                      committee member's CA firm). Picking a member
                      here prefills name + phone + email so the
                      operator doesn't retype. They can edit any
                      field after picking. */}
                  <div className="space-y-2">
                    <Label htmlFor="vendor-from-member">Pick from members (optional)</Label>
                    <UserSearchSelect
                      scope="tenant"
                      value={null}
                      onChange={(hit) => {
                        if (!hit) return;
                        if (hit.name) setFormName(hit.name);
                        if (hit.phone) setFormPhone(hit.phone.replace(/^\+91/, ''));
                        if (hit.email) setFormEmail(hit.email);
                      }}
                      placeholder="Search by name or phone\u2026"
                    />
                    <p className="text-xs text-muted-foreground">
                      Typing a brand-new vendor? Skip this picker and fill
                      the fields below directly.
                    </p>
                  </div>
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
                      <FormFieldError error={createVendor.error} field="phone" />
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'vendors' && (<>
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
                <TableHead className="w-12" />
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
                    <TableCell>
                      <ClickablePhone phone={vendor.phone} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVendorId(vendor.id);
                            setEditName(vendor.name);
                            setEditPan(vendor.pan ?? '');
                            setEditGstin(vendor.gstin ?? '');
                            setEditBankName('');
                            setEditBankAccount('');
                            setEditBankIfsc('');
                            setEditPhone(vendor.phone ?? '');
                            setEditEmail(vendor.email ?? '');
                            setEditDialogOpen(true);
                          }}
                          title="Edit vendor"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {vendor.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivateVendor(vendor.id);
                            }}
                            title="Deactivate vendor"
                            disabled={deactivateVendor.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
      </>)}

      {/* Ratings tab */}
      {activeTab === 'ratings' && (
        <>
          {/* Top Rated Providers */}
          {topRated.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Top Rated Providers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {topRated.map((provider) => (
                    <div key={provider.provider_phone} className="rounded-md border p-3 space-y-1.5">
                      <p className="font-medium text-sm">{provider.provider_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{provider.service_type}</p>
                      <StarRating rating={provider.avg_rating} />
                      <p className="text-xs text-muted-foreground">{provider.review_count} review{provider.review_count !== 1 ? 's' : ''}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Ratings table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">All Ratings</CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={ratingServiceFilter}
                    onChange={(e) => { setRatingServiceFilter(e.target.value); setRatingPage(1); }}
                    className="w-40"
                  >
                    <option value="">All Services</option>
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="carpenter">Carpenter</option>
                    <option value="painter">Painter</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="security">Security</option>
                    <option value="gardener">Gardener</option>
                    <option value="other">Other</option>
                  </Select>
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search provider..."
                      value={ratingSearchInput}
                      onChange={(e) => setRatingSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRatingSearch();
                      }}
                      className="pl-9"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRatingSearch}>
                    Search
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratingsQuery.isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : ratings.length > 0 ? (
                    ratings.map((rating) => (
                      <TableRow key={rating.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rating.provider_name}</p>
                            <p className="text-xs text-muted-foreground">{rating.provider_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{rating.service_type}</TableCell>
                        <TableCell>
                          <StarRating rating={rating.rating} />
                        </TableCell>
                        <TableCell>
                          <p className="max-w-48 truncate text-sm text-muted-foreground" title={rating.review}>
                            {rating.review || '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {rating.is_verified ? (
                            <Badge variant="success" className="gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{rating.reviewer_name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDate(rating.created_at)}</TableCell>
                        <TableCell>
                          {!rating.is_verified && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleVerifyRating(rating.id)}
                              title="Verify rating"
                              disabled={verifyRating.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No ratings found. Ratings will appear here as residents review service providers.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {totalRatingPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {ratingPage} of {totalRatingPages} ({totalRatings} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ratingPage <= 1}
                      onClick={() => setRatingPage(ratingPage - 1)}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ratingPage >= totalRatingPages}
                      onClick={() => setRatingPage(ratingPage + 1)}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Vendor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditVendor}>
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
              <DialogDescription>Update vendor details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-vendor-name">Vendor Name</Label>
                <Input
                  id="edit-vendor-name"
                  placeholder="e.g., ABC Services"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vendor-pan">PAN</Label>
                  <Input
                    id="edit-vendor-pan"
                    placeholder="AAAAA1234A"
                    maxLength={10}
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    title="PAN must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)"
                    style={{ textTransform: 'uppercase' }}
                    value={editPan}
                    onChange={(e) => setEditPan(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-vendor-gstin">GSTIN</Label>
                  <Input
                    id="edit-vendor-gstin"
                    placeholder="Optional"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bank Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Bank Name"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                  />
                  <Input
                    placeholder="IFSC Code"
                    value={editBankIfsc}
                    onChange={(e) => setEditBankIfsc(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Account Number"
                  value={editBankAccount}
                  onChange={(e) => setEditBankAccount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vendor-phone">Phone</Label>
                  <Input
                    id="edit-vendor-phone"
                    type="tel"
                    placeholder="10-digit phone"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    inputMode="numeric"
                    title="Phone must be exactly 10 digits"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                  />
                  <FormFieldError error={updateVendor.error} field="phone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-vendor-email">Email</Label>
                  <Input
                    id="edit-vendor-email"
                    type="email"
                    placeholder="Email address"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={updateVendor.isPending}>
                {updateVendor.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vendor Detail Dialog */}
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
                  <p><ClickablePhone phone={vendorDetail.phone} /></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p><ClickableEmail email={vendorDetail.email} /></p>
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openEditDialog}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
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
