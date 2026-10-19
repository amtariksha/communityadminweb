/** Labels the Approved Users screen shows for units and member types. */

const MEMBER_TYPE_LABELS: Record<string, string> = {
  owner: 'Owner',
  tenant: 'Tenant',
  owner_family: 'Owner Family',
  tenant_family: 'Tenant Family',
  family: 'Family',
  family_member: 'Family',
};

export function memberTypeLabel(memberType: string): string {
  return MEMBER_TYPE_LABELS[memberType] ?? memberType.replace(/_/g, ' ');
}

/** "Block-Unit", e.g. "A-101"; a unit number that already starts with its block is kept as it is. */
export function blockUnitLabel(unit: { block: string | null; unit_number: string }): string {
  if (!unit.block) return unit.unit_number;
  const prefix = `${unit.block}-`;
  return unit.unit_number.toUpperCase().startsWith(prefix.toUpperCase()) ? unit.unit_number : `${prefix}${unit.unit_number}`;
}

/** A short file type for the Documents section: PDF, JPG, … */
export function fileTypeLabel(document: { file_name: string; mime_type: string | null }): string {
  const extension = document.file_name.includes('.') ? document.file_name.split('.').pop() : undefined;
  if (extension) return extension.toUpperCase();
  return document.mime_type?.split('/').pop()?.toUpperCase() ?? '—';
}

export const APPROVED_USERS_ROUTE = '/units/approved';

export function unitPanelHref(unitId: string): string {
  return `${APPROVED_USERS_ROUTE}/${unitId}`;
}
