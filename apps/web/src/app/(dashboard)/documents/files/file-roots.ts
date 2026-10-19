import type { DocumentAudienceRole } from '@/hooks/use-documents';

/** Where a file lives in Admin Files (FILE-S3): one of the two roots, or a unit. */
export type FileRoot = 'admin' | 'residents' | 'unit';

/** Resident Documents audience: All residents, Owners only, Tenants only. */
export type ResidentAudience = 'all' | 'owner' | 'tenant_resident';

export const ROOT_LABELS: Readonly<Record<FileRoot, string>> = {
  admin: 'Admin Documents',
  residents: 'Resident Documents',
  unit: 'Unit',
};

export interface PlacementFields {
  folder_type: 'common' | 'unit' | 'committee';
  audience_role: DocumentAudienceRole | null;
  audience_unit_id: string | null;
  unit_id: string | null;
}

/**
 * The document columns for a root (FILE-S3): the admin root is the
 * committee folder and audience together (FILE-03); the resident root
 * carries the chosen audience; a unit file is shown to that unit.
 */
export function placementFor(root: FileRoot, audience: ResidentAudience, unitId: string): PlacementFields {
  if (root === 'admin') {
    return { folder_type: 'committee', audience_role: 'committee_member', audience_unit_id: null, unit_id: null };
  }
  if (root === 'unit') {
    return { folder_type: 'unit', audience_role: null, audience_unit_id: unitId || null, unit_id: unitId || null };
  }
  return { folder_type: 'common', audience_role: audience === 'all' ? null : audience, audience_unit_id: null, unit_id: null };
}

/** The root a stored document is in. */
export function rootOf(file: { folder_type?: string | null; unit_id?: string | null }): FileRoot {
  if (file.folder_type === 'committee') return 'admin';
  if (file.folder_type === 'unit' || file.unit_id) return 'unit';
  return 'residents';
}

export function parseRoot(value: string | null): FileRoot {
  return value === 'admin' || value === 'unit' ? value : 'residents';
}

/** The list a root's files are on. */
export function rootListHref(root: FileRoot, unitId?: string | null): string {
  if (root === 'admin') return '/documents/common/admin';
  if (root === 'unit') return unitId ? `/documents/units/${unitId}` : '/documents/units';
  return '/documents/common/residents';
}

/** A `return=` link back to an Admin Files page, never elsewhere. */
export function safeReturn(value: string | null, fallback: string): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
