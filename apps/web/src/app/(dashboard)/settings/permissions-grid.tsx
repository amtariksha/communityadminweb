'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface PermissionCell {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export type PermissionField = keyof PermissionCell;

// Keep both lists aligned with RESOURCES / DEFAULT_MATRIX in
// apps/api/src/modules/rbac/default-matrix.ts.
export const RBAC_RESOURCES = [
  'dashboard',
  'finance',
  'invoices',
  'receipts',
  'bank',
  'purchases',
  'vendors',
  'gate',
  'visitors',
  'tickets',
  'amenities',
  'units',
  'members',
  'staff',
  'announcements',
  'documents',
  'utilities',
  'voting',
  'compliance',
  'reports',
  'analytics',
  'settings',
] as const;

export const RBAC_ROLES = [
  'community_admin',
  'accountant',
  'committee_member',
  'auditor',
  'moderator',
  'security_supervisor',
  'facility_supervisor',
  'security_guard',
  'owner',
  'tenant_resident',
] as const;

/**
 * Roles the grid decides for some resources only (D11): the moderator has a
 * dashboard cell and nothing else, so elsewhere its routes decide.
 */
const PARTIAL_ROLES: Readonly<Record<string, readonly string[]>> = {
  moderator: ['dashboard'],
};

const ALL_FIELDS: readonly PermissionField[] = ['can_read', 'can_write', 'can_delete'];

/** The boxes a cell offers: the dashboard is only ever read; a partial role's other cells offer none. */
export function cellFields(role: string, resource: string): readonly PermissionField[] {
  const partial = PARTIAL_ROLES[role];
  if (partial && !partial.includes(resource)) return [];
  return resource === 'dashboard' ? ['can_read'] : ALL_FIELDS;
}

const BOX: Record<PermissionField, { letter: string; title: string; tone: string }> = {
  can_read: { letter: 'R', title: 'Read', tone: 'text-green-500' },
  can_write: { letter: 'W', title: 'Write', tone: 'text-blue-500' },
  can_delete: { letter: 'D', title: 'Delete', tone: 'text-red-500' },
};

interface PermissionsGridProps {
  getPermission: (role: string, resource: string) => PermissionCell;
  onChange: (role: string, resource: string, field: PermissionField, value: boolean) => void;
}

function GridCell({ role, resource, getPermission, onChange }: PermissionsGridProps & { role: string; resource: string }): ReactNode {
  const fields = cellFields(role, resource);
  if (fields.length === 0) {
    return (
      <span className="text-muted-foreground" title="Not set here: this role's screens decide">
        —
      </span>
    );
  }
  const perms = getPermission(role, resource);
  return (
    <div className="flex items-center justify-center gap-2">
      {fields.map((field) => (
        <label key={field} className="flex cursor-pointer flex-col items-center gap-0.5" title={BOX[field].title}>
          <span className={`text-[10px] font-bold ${BOX[field].tone}`}>{BOX[field].letter}</span>
          <input
            type="checkbox"
            aria-label={`${role} ${resource} ${BOX[field].title}`}
            className="rounded border-input"
            checked={perms[field]}
            onChange={(e) => onChange(role, resource, field, e.target.checked)}
          />
        </label>
      ))}
    </div>
  );
}

/** The Roles & Permissions table: one row per role, one column per resource. */
export function PermissionsGrid(props: PermissionsGridProps): ReactNode {
  return (
    <>
      <div className="mb-4 flex items-center gap-6 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1"><span className="font-bold text-green-500">R</span> = Read (view data)</span>
        <span className="flex items-center gap-1"><span className="font-bold text-blue-500">W</span> = Write (create &amp; edit)</span>
        <span className="flex items-center gap-1"><span className="font-bold text-red-500">D</span> = Delete (remove data)</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Role</TableHead>
              {RBAC_RESOURCES.map((resource) => (
                <TableHead key={resource} className="min-w-[100px] text-center capitalize">
                  {resource}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {RBAC_ROLES.map((role) => (
              <TableRow key={role}>
                <TableCell className="sticky left-0 whitespace-nowrap bg-background font-medium capitalize">
                  {role.replace(/_/g, ' ')}
                </TableCell>
                {RBAC_RESOURCES.map((resource) => (
                  <TableCell key={resource} className="text-center">
                    <GridCell role={role} resource={resource} {...props} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
