'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UserPlus,
  MoreVertical,
  Undo2,
  AlertTriangle,
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
import { ApiError, friendlyError } from '@/lib/api-error';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { TOOLTIP } from '@/lib/tooltip-content';
import {
  useSuperAdminUsers,
  useSuperAdminUserRoles,
  useAssignUserRole,
  useRemoveUserRole,
  useSuperAdminUnitsForTenant,
  useTenants,
} from '@/hooks';
import {
  useDeleteSuperAdminUser,
  useRestoreSuperAdminUser,
} from '@/hooks/use-super-admin-users';
import type { SuperAdminUser } from '@/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
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
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
  // Migration 056 — show soft-deleted users so the operator can pick
  // Restore. Off by default to keep the active list focused.
  const [showDeleted, setShowDeleted] = useState(false);

  // Role dialog
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // Soft-delete confirmation dialog
  const [deleteUser, setDeleteUser] = useState<SuperAdminUser | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  // Set to true when the backend returns 400 with `last_admin_orphaning`
  // — the operator confirms they're aware and resubmits with force.
  const [deleteForce, setDeleteForce] = useState(false);
  const [orphaningTenants, setOrphaningTenants] = useState<
    Array<{ tenant_id: string; tenant_name: string }>
  >([]);

  // Add role form
  const [newRoleTenantId, setNewRoleTenantId] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleUnitId, setNewRoleUnitId] = useState('');
  // Optional ISO date (yyyy-mm-dd). Blank = no expiry. Only meaningful
  // for non-resident roles — resident expiry inherits from the unit's
  // lease_end_date at the backend, so we hide this input when a
  // resident role is selected.
  const [newRoleExpiresAt, setNewRoleExpiresAt] = useState('');

  // Add member dialog
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // Queries
  const usersQuery = useSuperAdminUsers({
    search: searchQuery || undefined,
    page,
    limit: ITEMS_PER_PAGE,
    include_deleted: showDeleted,
  });
  const userRolesQuery = useSuperAdminUserRoles(selectedUser?.id ?? '');
  const tenantsQuery = useTenants({ limit: 100 });
  // Units for the currently-selected tenant — only fetched when the
  // resident-role branch is active. Disabled otherwise.
  const unitsQuery = useSuperAdminUnitsForTenant(newRoleTenantId || null);

  // Mutations
  const assignRole = useAssignUserRole();
  const removeRole = useRemoveUserRole();
  const deleteUserMutation = useDeleteSuperAdminUser();
  const restoreUserMutation = useRestoreSuperAdminUser();

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

  // Roles that imply physical residence — backend also keeps this list
  // server-side. Must agree, otherwise assignment 400s with
  // "unit_id required for resident roles".
  const RESIDENT_ROLE_SLUGS = new Set([
    'owner',
    'tenant_resident',
    'tenant',
    'owner_family',
    'family_member',
    'tenant_family',
  ]);
  const isResidentRole = RESIDENT_ROLE_SLUGS.has(newRoleSlug);

  function openRoleDialog(user: SuperAdminUser): void {
    setSelectedUser(user);
    setRoleDialogOpen(true);
    setNewRoleTenantId('');
    setNewRoleSlug('');
    setNewRoleUnitId('');
    setNewRoleExpiresAt('');
  }

  function handleAssignRole(): void {
    if (!selectedUser || !newRoleTenantId || !newRoleSlug) return;
    if (isResidentRole && !newRoleUnitId) {
      addToast({
        title: 'Unit is required',
        description: 'Resident roles must be linked to a specific unit so they appear in the Member Directory.',
        variant: 'destructive',
      });
      return;
    }

    // ISO date → ISO timestamp at end-of-day IST (= 18:30 UTC the day
    // before) so an expiry date of 2026-12-31 means "access works
    // through the whole of Dec 31 in the society's local time."
    const expiresAtIso = !isResidentRole && newRoleExpiresAt
      ? new Date(`${newRoleExpiresAt}T23:59:59+05:30`).toISOString()
      : undefined;

    assignRole.mutate(
      {
        user_id: selectedUser.id,
        tenant_id: newRoleTenantId,
        role: newRoleSlug,
        ...(isResidentRole ? { unit_id: newRoleUnitId } : {}),
        ...(expiresAtIso ? { expires_at: expiresAtIso } : {}),
      },
      {
        onSuccess() {
          addToast({
            title: isResidentRole
              ? 'Role assigned — member added to directory'
              : expiresAtIso
                ? `Role assigned — expires ${newRoleExpiresAt}`
                : 'Role assigned',
            variant: 'success',
          });
          setNewRoleTenantId('');
          setNewRoleSlug('');
          setNewRoleUnitId('');
          setNewRoleExpiresAt('');
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

  function openDeleteDialog(user: SuperAdminUser): void {
    setDeleteUser(user);
    setDeleteReason('');
    setDeleteForce(false);
    setOrphaningTenants([]);
  }

  function handleConfirmDelete(e: FormEvent): void {
    e.preventDefault();
    if (!deleteUser) return;
    if (deleteReason.trim().length === 0) {
      addToast({
        title: 'Reason is required',
        description: 'Record why this account is being removed.',
        variant: 'destructive',
      });
      return;
    }
    deleteUserMutation.mutate(
      {
        user_id: deleteUser.id,
        reason: deleteReason.trim(),
        force: deleteForce,
      },
      {
        onSuccess(data) {
          addToast({
            title: 'User deleted',
            description:
              data.cancelled_subscriptions > 0
                ? `${data.cancelled_subscriptions} autopay subscription(s) cancelled.`
                : 'Memberships ended; FCM tokens revoked.',
            variant: 'success',
          });
          setDeleteUser(null);
          setDeleteReason('');
          setDeleteForce(false);
          setOrphaningTenants([]);
        },
        onError(error) {
          // Backend returns 400 with code `last_admin_orphaning` + a
          // tenants list on `details` when the target is the only
          // community-admin somewhere. Surface the orphaning warning
          // so the operator can re-submit with `force: true` if they
          // really mean it.
          if (error instanceof ApiError && error.code === 'last_admin_orphaning') {
            const orphaning = error.details?.tenants as
              | Array<{ tenant_id: string; tenant_name: string }>
              | undefined;
            if (orphaning) {
              setOrphaningTenants(orphaning);
              return;
            }
          }
          addToast({
            title: 'Failed to delete user',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleRestoreUser(user: SuperAdminUser): void {
    if (
      !window.confirm(
        `Restore ${user.name ?? user.phone}? They will be able to log in again, but memberships and autopay are NOT auto-restored.`,
      )
    ) {
      return;
    }
    restoreUserMutation.mutate(user.id, {
      onSuccess() {
        addToast({ title: 'User restored', variant: 'success' });
      },
      onError(error) {
        addToast({
          title: 'Failed to restore user',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
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
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => {
                    setShowDeleted(e.target.checked);
                    setPage(1);
                  }}
                />
                Show deleted
              </label>
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
                <TableHead>Society</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <UserTableSkeleton />
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No users found' : 'No users yet'}
                  </TableCell>
                </TableRow>
              ) : (
                users.map(function renderUser(user) {
                  const isDeleted = user.deleted_at !== null;
                  return (
                    <TableRow
                      key={user.id}
                      className={
                        isDeleted
                          ? 'cursor-pointer hover:bg-muted/50 opacity-60'
                          : 'cursor-pointer hover:bg-muted/50'
                      }
                      onClick={() => {
                        if (!isDeleted) openRoleDialog(user);
                      }}
                    >
                      <TableCell className="font-mono text-sm">{user.phone}</TableCell>
                      <TableCell>
                        {user.name ?? <span className="text-muted-foreground italic">No name</span>}
                        {user.is_super_admin && (
                          <Badge variant="secondary" className="ml-2 text-xs">Super Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.tenant_roles && user.tenant_roles.length > 0
                          ? [...new Set(user.tenant_roles.map((tr) => tr.tenant_name))].join(', ')
                          : <span className="text-muted-foreground">--</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.tenant_roles && user.tenant_roles.length > 0
                          ? [...new Set(user.tenant_roles.map((tr) => tr.role))].map((role) => (
                              <Badge key={role} variant="outline" className="mr-1 mb-0.5 text-xs">{role}</Badge>
                            ))
                          : <span className="text-muted-foreground">--</span>}
                      </TableCell>
                      <TableCell>
                        {isDeleted ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          <Badge variant={user.is_active ? 'success' : 'destructive'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isDeleted ? (
                              <DropdownMenuItem onClick={() => handleRestoreUser(user)}>
                                <Undo2 className="mr-2 h-4 w-4" />
                                Restore user
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Manage roles
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(user)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete user
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            {/* Unit picker — only shown for resident roles. Backend
                rejects resident-role assignments without a unit_id,
                so we require it here too and explain why. */}
            {isResidentRole && (
              <div className="space-y-1">
                <Label htmlFor="role-unit" className="text-xs">
                  Unit <span className="text-destructive">*</span>
                </Label>
                <Select
                  id="role-unit"
                  value={newRoleUnitId}
                  onChange={(e) => setNewRoleUnitId(e.target.value)}
                  disabled={!newRoleTenantId || unitsQuery.isLoading}
                >
                  <option value="">
                    {!newRoleTenantId
                      ? 'Pick a tenant first…'
                      : unitsQuery.isLoading
                        ? 'Loading units…'
                        : `Select unit… (${unitsQuery.data?.length ?? 0} available)`}
                  </option>
                  {(unitsQuery.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `${u.block}-` : ''}{u.unit_number}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Residents must be linked to a unit so they appear in the tenant&apos;s Member Directory.
                </p>
              </div>
            )}
            {/* Expiry date — optional. Only offered for non-resident
                roles (e.g. security_supervisor from an external agency
                with a fixed contract). Resident expiry inherits from
                units.lease_end_date at the backend. */}
            {!isResidentRole && newRoleSlug && (
              <div className="space-y-1">
                <Label htmlFor="role-expires-at" className="text-xs">
                  Access expires on <span className="text-muted-foreground">(optional)</span>
                </Label>
                <input
                  id="role-expires-at"
                  type="date"
                  value={newRoleExpiresAt}
                  onChange={(e) => setNewRoleExpiresAt(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  min={new Date().toISOString().slice(0, 10)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for no expiry. On expiry the role auto-suspends when the tenant&apos;s enforcement mode is hybrid or filter-only.
                </p>
              </div>
            )}
            <Button
              size="sm"
              onClick={handleAssignRole}
              disabled={
                !newRoleTenantId ||
                !newRoleSlug ||
                (isResidentRole && !newRoleUnitId) ||
                assignRole.isPending
              }
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

      {/* Soft-delete confirmation. Two-stage: first submit checks the
          orphaning guard server-side, second submit (with deleteForce
          flagged) overrides. */}
      <Dialog
        open={deleteUser !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteUser(null);
            setDeleteReason('');
            setDeleteForce(false);
            setOrphaningTenants([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <form onSubmit={handleConfirmDelete}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete user
              </DialogTitle>
              <DialogDescription>
                {deleteUser?.name ?? deleteUser?.phone}
                {deleteUser?.name && (
                  <span className="text-muted-foreground"> ({deleteUser.phone})</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="font-medium">This will:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>End all current memberships (move-out date today)</li>
                  <li>Cancel any active autopay subscriptions</li>
                  <li>Revoke push-notification device tokens</li>
                  <li>Force the next protected request to 401 within 5 minutes</li>
                  <li>
                    Keep the audit trail (invoices, ledger entries, etc.)
                    intact — soft delete only
                  </li>
                </ul>
              </div>

              {orphaningTenants.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Last community admin warning
                  </p>
                  <p className="text-muted-foreground">
                    This user is the only community admin in:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {orphaningTenants.map((t) => (
                      <li key={t.tenant_id}>{t.tenant_name}</li>
                    ))}
                  </ul>
                  <label className="mt-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={deleteForce}
                      onChange={(e) => setDeleteForce(e.target.checked)}
                    />
                    Delete anyway — these tenants will have no admin until
                    super-admin reassigns one.
                  </label>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="delete-reason">Reason (required)</Label>
                <Textarea
                  id="delete-reason"
                  required
                  rows={3}
                  placeholder="e.g. Resident requested account closure; offboarded."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  deleteUserMutation.isPending ||
                  deleteReason.trim().length === 0 ||
                  (orphaningTenants.length > 0 && !deleteForce)
                }
              >
                {deleteUserMutation.isPending ? 'Deleting…' : 'Delete user'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
