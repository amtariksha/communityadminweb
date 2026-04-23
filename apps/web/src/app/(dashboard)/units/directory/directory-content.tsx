'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Mail,
  Pencil,
  CalendarClock,
} from 'lucide-react';
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
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import {
  useMemberDirectory,
  useBlocks,
  useUpdateMemberDetail,
} from '@/hooks';
import { formatDate } from '@/lib/utils';
import { normalizePhone } from '@/lib/validation';
import { ClickablePhone, ClickableEmail } from '@/components/ui/clickable-contact';
import { RenewLeaseDialog } from './renew-lease-dialog';
import type { DirectoryMember } from '@/hooks';

const PAGE_SIZE = 20;

function getMemberTypeBadge(type: string): ReactNode {
  switch (type) {
    case 'owner':
      return <Badge variant="default">Owner</Badge>;
    case 'tenant':
      return <Badge variant="warning">Tenant</Badge>;
    case 'owner_family':
      return <Badge variant="outline">Owner Family</Badge>;
    case 'tenant_family':
      return <Badge variant="outline">Tenant Family</Badge>;
    case 'family_member':
      return <Badge variant="outline">Family</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-10" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function DirectoryContent(): ReactNode {
  const { addToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberTypeFilter, setMemberTypeFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Edit member state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMemberId, setEditMemberId] = useState('');
  const [editUnitId, setEditUnitId] = useState('');
  const [editMemberType, setEditMemberType] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  // Access-expiry override (QA #2 follow-up). Only surfaced for
  // lease-bound member types — for owners it doesn't apply.
  const [editLeaseEndDate, setEditLeaseEndDate] = useState('');

  // Renew-lease dialog state — opens per tenant row.
  const [renewTarget, setRenewTarget] = useState<DirectoryMember | null>(null);

  const updateMember = useUpdateMemberDetail();

  const blocksQuery = useBlocks();
  const blocks = blocksQuery.data ?? [];

  const directoryQuery = useMemberDirectory({
    search: searchQuery || undefined,
    member_type: memberTypeFilter || undefined,
    block: blockFilter || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const members = directoryQuery.data?.data ?? [];
  const total = directoryQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  }

  function handleClearFilters(): void {
    setSearchInput('');
    setSearchQuery('');
    setMemberTypeFilter('');
    setBlockFilter('');
    setCurrentPage(1);
  }

  function openEditDialog(member: DirectoryMember): void {
    setEditMemberId(member.id);
    setEditUnitId(member.unit_id);
    setEditMemberType(member.member_type);
    setEditName(member.name ?? '');
    setEditPhone(member.phone ?? '');
    setEditEmail(member.email ?? '');
    // Pre-fill with the current backend value so the admin sees what
    // they're about to change. ISO yyyy-mm-dd is the shape expected
    // by <input type="date" /> natively.
    setEditLeaseEndDate(
      member.lease_end_date ? member.lease_end_date.slice(0, 10) : '',
    );
    setEditDialogOpen(true);
  }

  function handleEditSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!editMemberId || !editUnitId) return;

    // Previously no client-side check existed on this form, so any
    // 10-digit string (or a malformed one) was sent to the backend
    // and only the API's Indian-phone Zod caught it — surfacing as a
    // late "Failed to update member" toast with no detail.
    const phone = normalizePhone(editPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid phone number',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }

    // Only send lease_end_date if it changed semantics. Empty string on
    // a lease-bound role clears expiry (overrides to "no expiry"); on
    // an owner-type it is no-op.
    const isLeaseBound =
      editMemberType === 'tenant' ||
      editMemberType === 'tenant_family' ||
      editMemberType === 'family_member';

    updateMember.mutate(
      {
        unitId: editUnitId,
        memberId: editMemberId,
        name: editName || undefined,
        phone: phone.value || undefined,
        email: editEmail || null,
        ...(isLeaseBound
          ? { lease_end_date: editLeaseEndDate || null }
          : {}),
      },
      {
        onSuccess() {
          setEditDialogOpen(false);
          addToast({ title: 'Member updated successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to update member', variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Units', href: '/units' },
          { label: 'Member Directory' },
        ]}
        title="Member Directory"
        description="Search and browse all members across all units"
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="dir-search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dir-search"
                  placeholder="Name, phone, or unit number..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (e.target.value === '') {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dir-type">Member Type</Label>
              <Select
                id="dir-type"
                value={memberTypeFilter}
                onChange={(e) => {
                  setMemberTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Types</option>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
                <option value="owner_family">Owner Family</option>
                <option value="tenant_family">Tenant Family</option>
                <option value="family_member">Family Member</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dir-block">Block</Label>
              <Select
                id="dir-block"
                value={blockFilter}
                onChange={(e) => {
                  setBlockFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Blocks</option>
                {blocks.map((b) => (
                  <option key={b} value={b}>Block {b}</option>
                ))}
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch}>
              Search
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Members
            </CardTitle>
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit #</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Since</TableHead>
                <TableHead className="w-12">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {directoryQuery.isLoading ? (
                <TableSkeleton />
              ) : directoryQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-destructive">
                    Failed to load member directory —{' '}
                    {(directoryQuery.error as Error)?.message ?? 'unknown error'}.{' '}
                    <Button
                      size="sm"
                      variant="link"
                      className="px-1 text-destructive underline"
                      onClick={() => directoryQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.unit_number}</TableCell>
                    <TableCell>{member.block ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {member.name ?? 'Unknown'}
                        {member.is_primary_contact && (
                          <Badge variant="success" className="ml-1 text-[10px] px-1 py-0">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <ClickablePhone phone={member.phone} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <ClickableEmail email={member.email} />
                      </span>
                    </TableCell>
                    <TableCell>{getMemberTypeBadge(member.member_type)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(member.move_in_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Edit"
                          onClick={() => openEditDialog(member)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {/* Renew Lease — only for primary tenant members.
                            Family members inherit the lease via the unit,
                            so renewing one's row doesn't make sense. */}
                        {member.member_type === 'tenant' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Renew lease"
                            onClick={() => setRenewTarget(member)}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update member details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dir-name">Name</Label>
                <Input
                  id="edit-dir-name"
                  placeholder="Full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dir-phone">Phone</Label>
                <Input
                  id="edit-dir-phone"
                  placeholder="10-digit mobile (optional +91 prefix)"
                  maxLength={13}
                  inputMode="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dir-email">Email</Label>
                <Input
                  id="edit-dir-email"
                  type="email"
                  placeholder="email@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              {/*
                Lease-end / access-expiry override. Only lease-bound
                member types (tenant / tenant_family / family_member)
                see this — owners' access is tied to ownership, not a
                date. Setting a future date restores access when a
                tenant sees "access expired" on the Flutter app.
                Clearing it (setting empty + save) removes any expiry.
              */}
              {(editMemberType === 'tenant' ||
                editMemberType === 'tenant_family' ||
                editMemberType === 'family_member') && (
                <div className="space-y-2">
                  <Label htmlFor="edit-dir-lease-end">
                    Access expires on{' '}
                    <span className="text-muted-foreground">(override)</span>
                  </Label>
                  <Input
                    id="edit-dir-lease-end"
                    type="date"
                    value={editLeaseEndDate}
                    onChange={(e) => setEditLeaseEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to remove any expiry. Setting a future
                    date immediately restores access on the resident
                    app — no approval needed. For a full lease
                    renewal with fresh agreement upload, use the
                    calendar-clock icon on the row instead.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={updateMember.isPending}>
                {updateMember.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renew Lease Dialog — only mounted when a target is set so
          the file input resets cleanly between invocations. */}
      {renewTarget && (
        <RenewLeaseDialog
          open={renewTarget !== null}
          onClose={() => setRenewTarget(null)}
          unitId={renewTarget.unit_id}
          unitLabel={
            renewTarget.block
              ? `${renewTarget.block}-${renewTarget.unit_number}`
              : renewTarget.unit_number
          }
          tenantName={renewTarget.name}
        />
      )}
    </div>
  );
}
