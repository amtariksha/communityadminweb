/**
 * R5-STATECODE — a party's GST state code is the two-digit code of the GST
 * state code list: 01–38, 97 (Other Territory) and 99 (Centre Jurisdiction).
 * A GSTIN starts with its holder's state code, so when both are given they
 * must agree. Mirrors communityos `common/gst/gst-state-code.ts`.
 */
export const GST_STATE_CODES: ReadonlySet<string> = new Set([
  ...Array.from({ length: 38 }, (_, index) => String(index + 1).padStart(2, '0')),
  '97',
  '99',
]);

export const STATE_CODE_MESSAGE = 'Enter the two-digit GST state code, e.g. 29 for Karnataka';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const compactUpper = (text: string | null | undefined): string => (text ?? '').trim().toUpperCase().replace(/\s+/g, '');

/** Why a GSTIN does not go with the state code, or null when they agree or one is missing. */
function gstinMismatch(stateCode: string, gstin: string): string | null {
  if (!stateCode || !GSTIN_PATTERN.test(gstin) || gstin.slice(0, 2) === stateCode) return null;
  return `The GSTIN starts with ${gstin.slice(0, 2)} but the state code is ${stateCode}. They must match.`;
}

/** Add party: what is wrong with the state code and GSTIN entered, or null. */
export function partyStateCodeError(stateCode: string, gstin: string): string | null {
  const code = stateCode.trim();
  if (code && !GST_STATE_CODES.has(code)) return STATE_CODE_MESSAGE;
  return gstinMismatch(code, compactUpper(gstin));
}

/**
 * Edit party: checks only what the edit changes, as the API does, so a state
 * code saved before this check does not block an unrelated edit.
 */
export function editedPartyStateCodeError(
  stored: { state_code?: string | null; gstin?: string | null },
  edited: { stateCode: string; gstin: string },
): string | null {
  const storedCode = (stored.state_code ?? '').trim();
  const code = edited.stateCode.trim();
  const gstin = compactUpper(edited.gstin);
  const codeChanged = code !== '' && code !== storedCode;
  const gstinChanged = gstin !== '' && gstin !== compactUpper(stored.gstin);
  if (codeChanged && !GST_STATE_CODES.has(code)) return STATE_CODE_MESSAGE;
  if (!codeChanged && !gstinChanged) return null;
  return gstinMismatch(code || storedCode, gstin || compactUpper(stored.gstin));
}
