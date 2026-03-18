'use client';

import { useState, type ReactNode } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserPlus,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { TOOLTIP } from '@/lib/tooltip-content';
import {
  useSuperAdminUsers,
  useSuperAdminUserRoles,
  useAssignUserRole,
  useRemoveUserRole,
  useTenants,
} from '@/hooks';
import type { SuperAdminUser } from '@/hooks';
import AddMemberDialog from './add-member-dialog';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 20;

const ASSIGNABLE_ROLES = [
  { slug: 'committee_member', label: 'Committee Member' },
  { slug: 'accountant', label: 'Accountant' },
  { slug: 'moderator', label: 'Moderator' },
  { slug: 'auditor', label: 'Auditor' },
  { slug: 'owner', label: 'Owner' },
  { slug: 'tenant_resident', label: 'Tenant / Resident' },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function UserTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12 text-right" /></TableCell>
          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UserManagement(): ReactNode {
  const { addToast } = useToast();

  // Search & pagination
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Role dialog
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // Add role form
  const [newRoleTenantId, setNewRoleTenantId] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');

  // Add member dialog
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // Queries
  const usersQuery = useSuperAdminUsers({
    search: searchQuery || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const userRolesQuery = useSuperAdminUserRoles(selectedUser?.id ?? '');
  const tenantsQuery = useTenants({ limit: 100 });

  // Mutations
  const assignRole = useAssignUserRole();
  const removeRole = useRemoveUserRole();

  // Derived
  const users = usersQuery.data?.data ?? [];
  const totalUsers = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / ITEMS_PER_PAGE));
  const tenantsList = tenantsQuery.data?.data ?? [];
  const roles = userRolesQuery.data ?? [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSearch(): void {
    setSearchQuery(searchInput);
    setPage(1);
  }

  function openRoleDialog(user: SuperAdminUser): void {
    setSelectedUser(user);
    setRoleDialogOpen(true);
    setNewRoleTenantId('');
    setNewRoleSlug('');
  }

  function handleAssignRole(): void {
    if (!selectedUser || !newRoleTenantId || !newRoleSlug) return;

    assignRole.mutate(
      { user_id: selectedUser.id, tenant_id: newRoleTenantId, role: newRoleSlug },
      {
        onSuccess() {
          addToast({ title: 'Role assigned', variant: 'success' });
          setNewRoleTenantId('');
          setNewRoleSlug('');
        },
        onError(error) {
          addToast({ title: 'Failed to assign role', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  function handleRemoveRole(tenantId: string, roleSlug: string): void {
    if (!selectedUser) return;

    removeRole.mutate(
      { user_id: selectedUser.id, tenant_id: tenantId, role_slug: roleSlug },
      {
        onSuccess() {
          addToast({ title: 'Role removed', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to remove role', description: error.message, variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              All Users
              <HelpTooltip text={TOOLTIP.superAdmin.userSearch} side="right" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search phone, name, email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                Search
              </Button>
              <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add to Society
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Tenants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <UserTableSkeleton />
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No users found' : 'No users yet'}
                  </TableCell>
                </TableRow>
              ) : (
                users.map(function renderUser(user) {
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openRoleDialog(user)}
                    >
                      <TableCell className="font-mono text-sm">{user.phone}</TableCell>
                      <TableCell>
                        {user.name ?? <span className="text-muted-foreground italic">No name</span>}
                        {user.is_super_admin && (
                          <Badge variant="secondary" className="ml-2 text-xs">Super Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{user.tenant_count}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'success' : 'destructive'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalUsers} users)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role management dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Roles</DialogTitle>
            <DialogDescription>
              {selectedUser?.name ?? selectedUser?.phone ?? ''}
              {selectedUser?.name && (
                <span className="text-muted-foreground"> ({selectedUser.phone})</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Current roles */}
          {userRolesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No roles assigned yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(function renderRole(role) {
                  return (
                    <TableRow key={`${role.tenant_id}-${role.role_slug}`}>
                      <TableCell className="text-sm">{role.tenant_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{role.role_name}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(role.assigned_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemoveRole(role.tenant_id, role.role_slug)}
                          disabled={removeRole.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Add role form */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Role
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="role-tenant" className="text-xs">Tenant</Label>
                <Select
                  id="role-tenant"
                  value={newRoleTenantId}
                  onChange={(e) => setNewRoleTenantId(e.target.value)}
                >
                  <option value="">Select tenant...</option>
                  {tenantsList.map(function renderTenantOption(t) {
                    return (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    );
                  })}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="role-slug" className="text-xs">Role</Label>
                <Select
                  id="role-slug"
                  value={newRoleSlug}
                  onChange={(e) => setNewRoleSlug(e.target.value)}
                >
                  <option value="">Select role...</option>
                  {ASSIGNABLE_ROLES.map(function renderRoleOption(r) {
                    return (
                      <option key={r.slug} value={r.slug}>{r.label}</option>
                    );
                  })}
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAssignRole}
              disabled={!newRoleTenantId || !newRoleSlug || assignRole.isPending}
            >
              {assignRole.isPending ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
      />
    </>
  );
}
