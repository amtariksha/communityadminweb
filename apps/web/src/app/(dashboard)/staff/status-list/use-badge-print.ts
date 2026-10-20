'use client';

import { useCallback } from 'react';
import { useSocietyProfile } from '@/hooks/use-society-profile';
import type { StaffRegisterRow } from '@/hooks/use-staff-register';
import { useStaffSettings } from '@/hooks/use-staff-settings';
import { useStoredFileUrl } from '@/hooks/use-stored-file';
import { printHtml } from '@/lib/download';
import { storedFileLink } from '@/lib/stored-file';
import { badgeHtml } from './badge-print';

/**
 * STAFF-43 — Badge on a staff row prints that person's card. The ID card
 * header is an upload in the private bucket, so the card draws it from its
 * signed link (lib/stored-file.ts), as the STAFF-31 sheets do; a header that
 * is not available prints the society's name instead.
 */
export function useBadgePrint(): (row: StaffRegisterRow) => Promise<void> {
  const settings = useStaffSettings().data ?? null;
  const society = useSocietyProfile().data;
  const storedHeader = settings?.badge_header_image_url ?? null;
  // Asked for when the list opens, so a click finds the link already held.
  useStoredFileUrl(storedHeader);
  const societyName = society?.display_name || society?.name || '';

  return useCallback(
    async (row: StaffRegisterRow) => {
      const header = storedHeader ? await storedFileLink(storedHeader) : null;
      printHtml(badgeHtml(row, settings && { ...settings, badge_header_image_url: header }, societyName));
    },
    [settings, storedHeader, societyName],
  );
}
