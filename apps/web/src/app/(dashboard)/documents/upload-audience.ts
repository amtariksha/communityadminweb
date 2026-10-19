import type { DocumentAudienceRole } from '@/hooks/use-documents';

/** Who an uploaded document is for, as picked in the upload dialog. */
export type UploadAudience = 'all' | DocumentAudienceRole | 'unit';

export interface AudienceFields {
  audience_role: DocumentAudienceRole | null;
  audience_unit_id: string | null;
  unit_id: string | null;
  folder_type: 'common' | 'unit' | 'committee';
}

/**
 * The audience columns for an upload. "All residents" leaves both audience
 * axes empty; a role narrows to that role; "Specific unit" files it under
 * the unit and shows it only to that unit's members.
 */
export function audienceFields(audience: UploadAudience, unitId: string): AudienceFields {
  if (audience === 'unit') {
    return { audience_role: null, audience_unit_id: unitId || null, unit_id: unitId || null, folder_type: 'unit' };
  }
  return {
    audience_role: audience === 'all' ? null : audience,
    audience_unit_id: null,
    unit_id: null,
    folder_type: 'common',
  };
}
