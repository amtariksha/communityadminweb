'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Search, UserPlus, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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
import { useToast } from '@/components/ui/toast';
import { useTenantMembers, useUpdateTenantMember, useRemoveTenantMember } from '@/hooks';
import type { TenantMember } from '@/hooks';

const ITEMS_PER_PAGE = 10;

const ASSIGNABLE_ROLES = [
  { slug: 'community_admin', label: 'Community Admin' },
  { slug: 'committee_member', label: 'Committee Member' },
  { slug: 'accountant', label: 'Accountant' },
  { slug: 'moderator', label: 'Moderator' },
  { slug: 'security_guard', label: 'Security Guard' },
  { slug: 'auditor', label: 'Auditor' },
  { slug: 'owner', label: 'Owner' },
  { slug: 'tenant_resident', label: 'Tenant / Resident' },
];

interface TenantMembersProps {
  tenantId: string;
  onAddMember: () => void;
}

export default function TenantMembers({ tenantId, onAddMember }: TenantMembersProps): ReactNode {
  const { addToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Edit member state
  const [editOpen, setEditOpen] = useState(false);
  const [editMember, setEditMember] = useState<TenantMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);

  // Remove member state
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeMember, setRemoveMember] = useState<TenantMember | null>(null);

  const updateMember = useUpdateTenantMember();
  const removeMemberMutation = useRemoveTenantMember();

  const membersQuery = useTenantMembers(tenantId, {
    search: searchQuery || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const members = membersQuery.data?.data ?? [];
  const totalMembers = membersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMembers / ITEMS_PER_PAGE));

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setPage(1);
  }

  function openEditDialog(member: TenantMember): void {
    setEditMember(member);
    setEditName(member.name ?? '');
    setEditRoles([...member.roles]);
    setEditOpen(true);
  }

  function toggleEditRole(slug: string): void {
    setEditRoles((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug],
    );
  }

  function handleEditSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!editMember || editRoles.length === 0) return;

    updateMember.mutate(
      {
        tenantId,
        userId: editMember.id,
        name: editName || undefined,
        roles: editRoles,
      },
      {
        onSuccess() {
          setEditOpen(false);
          setEditMember(null);
          addToast({ title: 'Member updated successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to update member', variant: 'destructive' });
        },
      },
    );
  }

  function openRemoveDialog(member: TenantMember): void {
    setRemoveMember(member);
    setRemoveOpen(true);
  }

  function handleRemoveConfirm(): void {
    if (!removeMember) return;

    removeMemberMutation.mutate(
      { tenantId, userId: removeMember.id },
      {
        onSuccess() {
          setRemoveOpen(false);
          setRemoveMember(null);
          addToast({ title: 'Member removed successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to remove member', variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Members ({totalMembers})</h3>
        <Button size="sm" onClick={onAddMember}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {membersQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No members found. Add the first member to this society.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-mono text-sm">{member.phone}</TableCell>
                <TableCell>{member.name ?? <span className="text-muted-foreground italic">No name</span>}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.role_names.map((roleName, idx) => (
                      <Badge key={member.roles[idx]} variant="outline" className="text-xs">
                        {roleName}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {member.unit_number ?? '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(member)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => openRemoveDialog(member)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Member Dialog */}
      <Dialog open={editOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditMember(null); setEditOpen(isOpen); }}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update details for {editMember?.phone ?? ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-member-name">Name</Label>
                <Input
                  id="edit-member-name"
                  placeholder="Full name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Roles <span className="text-xs text-muted-foreground font-normal">(select one or more)</span></Label>
                <div className="grid gap-2 max-h-48 overflow-y-auto rounded-md border p-2">
                  {ASSIGNABLE_ROLES.map((r) => (
                    <label
                      key={r.slug}
                      className={`flex items-center gap-3 rounded-md border p-2 cursor-pointer transition-colors hover:bg-accent ${
                        editRoles.includes(r.slug) ? 'border-primary bg-primary/5' : 'border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={r.slug}
                        checked={editRoles.includes(r.slug)}
                        onChange={() => toggleEditRole(r.slug)}
                      />
                      <span className="text-sm">{r.label}</span>
                    </label>
                  ))}
                </div>
                {editRoles.length === 0 && (
                  <p className="text-xs text-destructive">Select at least one role</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={editRoles.length === 0 || updateMember.isPending}>
                {updateMember.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeMember?.name ?? removeMember?.phone ?? 'this member'} from the society? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={removeMemberMutation.isPending}
              onClick={handleRemoveConfirm}
            >
              {removeMemberMutation.isPending ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
