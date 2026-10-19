import { serviceDateError } from '@/lib/service-date';

/**
 * Rules of the Create Request form (HELP-S5), kept apart from the screen
 * so the dialog and the page validate the same way.
 */

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');
export const MAX_TEXT = 5000;
const MAX_SUBJECT = 120;

/** The subject stored for a request: its first line, markup removed, ≤ 120 characters. */
export function requestSubject(text: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .find((line) => line !== '');
  return (firstLine ?? '').slice(0, MAX_SUBJECT);
}

export interface FileCheck {
  accepted: File[];
  refused: string[];
}

function refusal(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name}: only JPEG, PNG, WebP or PDF files can be attached.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: larger than 8 MB.`;
  return null;
}

/** Which picked files may join the `attached` ones, and why the others may not. */
export function checkFiles(attached: number, picked: readonly File[]): FileCheck {
  const accepted: File[] = [];
  const refused: string[] = [];
  for (const file of picked) {
    const reason = refusal(file);
    if (reason) refused.push(reason);
    else if (attached + accepted.length >= MAX_FILES) refused.push(`${file.name}: a request takes at most ${MAX_FILES} files.`);
    else accepted.push(file);
  }
  return { accepted, refused };
}

export interface RequestErrors {
  text?: string;
  category?: string;
  unit?: string;
  serviceDate?: string;
}

export interface RequestChecked {
  text: string;
  category: string;
  /** Personal requests are for a unit (HELP-15). */
  requestType?: 'personal' | 'community';
  unitId?: string;
  serviceDate?: string;
}

export function validateRequest({ text, category, requestType, unitId, serviceDate }: RequestChecked): RequestErrors {
  const errors: RequestErrors = {};
  if (requestSubject(text) === '') errors.text = 'Write your request.';
  else if (text.length > MAX_TEXT) errors.text = `Keep the request under ${MAX_TEXT} characters.`;
  if (!category) errors.category = 'Choose a category.';
  if (requestType === 'personal' && !unitId) errors.unit = 'Choose the unit this request is for.';
  const dateError = serviceDateError(serviceDate ?? '');
  if (dateError) errors.serviceDate = dateError;
  return errors;
}

export function hasRequestErrors(errors: RequestErrors): boolean {
  return Object.values(errors).some(Boolean);
}
