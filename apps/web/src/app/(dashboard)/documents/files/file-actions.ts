'use client';

import { fetchPresignedDownloadUrl } from '@/hooks/use-documents';
import type { DocumentFile } from '@/hooks/use-document-files';
import { currentRole } from '@/lib/current-role';

/** Opens a file in a new tab, or downloads it, through a short-lived link. */
export async function openDocumentFile(file: Pick<DocumentFile, 'file_url' | 'file_name'>, download: boolean): Promise<void> {
  const url = await fetchPresignedDownloadUrl({
    fileUrl: file.file_url,
    disposition: download ? 'attachment' : 'inline',
    fileName: file.file_name,
  });
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Who may upload, edit and archive (document.controller.ts: write roles;
// archive is DELETE, which the committee member does not hold).
const WRITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member', 'accountant']);
const ARCHIVE_ROLES = new Set(['super_admin', 'community_admin', 'accountant']);

export function canWriteDocuments(role: string | null = currentRole()): boolean {
  return role !== null && WRITE_ROLES.has(role);
}

export function canArchiveDocuments(role: string | null = currentRole()): boolean {
  return role !== null && ARCHIVE_ROLES.has(role);
}

const AUDIENCE_LABELS: Readonly<Record<string, string>> = {
  owner: 'Owners',
  tenant_resident: 'Tenants',
  committee_member: 'Committee',
};

/** Who a resident-root file is for: All residents, Owners or Tenants. */
export function audienceLabel(role: string | null | undefined): string {
  return role ? (AUDIENCE_LABELS[role] ?? role) : 'All residents';
}
