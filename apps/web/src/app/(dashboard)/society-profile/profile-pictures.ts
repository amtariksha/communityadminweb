'use client';

import { useUploadFileToS3 } from '@/hooks/use-documents';

/** Pictures on the society profile (PROF-S2): PNG, JPEG or WebP; the upload module keeps them. */
export const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const SLOT_PICTURE_BYTES = 2 * 1024 * 1024;
export const LOGO_BYTES = 1024 * 1024;

/** Why a picked file cannot be used, or null. */
export function pictureProblem(file: Pick<File, 'type' | 'size'>, maxBytes: number): string | null {
  if (!(PICTURE_TYPES as readonly string[]).includes(file.type)) return 'Choose a PNG, JPEG or WebP picture.';
  if (file.size > maxBytes) return `The picture must be ${maxBytes / (1024 * 1024)} MB or smaller.`;
  return null;
}

/** Uploads a checked picture to our storage and gives its address. */
export function useUploadPicture(): (file: File) => Promise<string> {
  const upload = useUploadFileToS3();
  return async (file) => (await upload.mutateAsync({ file })).fileUrl;
}

/** Who may write the welcome message and pictures (PATCH /tenant-settings/profile, PROF-D6). */
export const PROFILE_CONTENT_EDITORS: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'committee_member']);
/** Who may change the logo, address and map point. */
export const PROFILE_ADMIN_EDITORS: ReadonlySet<string> = new Set(['super_admin', 'community_admin']);

/** A picture file the browser picks, or null when cancelled. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}
