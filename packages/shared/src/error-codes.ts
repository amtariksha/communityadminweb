/**
 * Registry of stable error codes emitted on `ApiErrorEnvelope.code`
 * and the user-friendly copy that should render when a client sees
 * the code.
 *
 * Every code here is:
 * - snake_case, module-prefixed where useful
 * - paired with a default HTTP status (the filter uses this status
 *   unless a throw site overrides it)
 * - paired with a plain-English `userMessage` — no jargon, tells the
 *   user what to do next when possible
 *
 * Clients (admin web `ApiError.userMessage`, Flutter `ApiException`)
 * look up the code and prefer `ERROR_CODES[code].userMessage` over
 * whatever English string the server's `message` field happens to
 * contain. That way server-side wording tweaks don't require a
 * client release.
 *
 * When adding a new code:
 * 1. Pick a stable snake_case name. Once shipped, do NOT rename it
 *    without a deprecation plan — old clients will keep sending
 *    the old code.
 * 2. Add an entry here.
 * 3. Have the throw site pass the code to `throwBusiness(code)`
 *    (see `apps/api/src/common/errors/business-error.ts`).
 * 4. Port the entry to the Flutter apps' Dart `ERROR_CODES` map.
 */

export interface ErrorCodeDef {
  /** Default HTTP status. Throw sites can override. */
  status: number;
  /** User-facing copy. Keep under 100 chars, actionable. */
  userMessage: string;
}

export const ERROR_CODES = {
  // ---------------------------------------------------------------
  // Auth (OTP) — already live; kept as the template for new codes.
  // ---------------------------------------------------------------
  otp_rate_limited: {
    status: 429,
    userMessage:
      'Too many OTP requests for this number. Please wait a minute and try again.',
  },
  otp_expired_or_missing: {
    status: 401,
    userMessage:
      'No active OTP for this number. Tap "Resend" and try again.',
  },
  otp_invalid: {
    status: 401,
    userMessage: 'The OTP you entered is incorrect. Please try again.',
  },

  // ---------------------------------------------------------------
  // Units
  // ---------------------------------------------------------------
  unit_not_found: {
    status: 404,
    userMessage: 'This unit no longer exists. It may have been removed.',
  },
  unit_has_active_members: {
    status: 409,
    userMessage:
      'This unit still has active members. Remove them before deleting the unit.',
  },
  unit_number_exists: {
    status: 409,
    userMessage:
      'A unit with this number already exists in this society.',
  },

  // ---------------------------------------------------------------
  // Vendors
  // ---------------------------------------------------------------
  vendor_name_exists: {
    status: 409,
    userMessage: 'A vendor with this name already exists.',
  },

  // ---------------------------------------------------------------
  // Invoicing
  // ---------------------------------------------------------------
  invoice_already_posted: {
    status: 409,
    userMessage:
      'This invoice has already been posted and cannot be changed. Create a credit note to reverse it.',
  },
  invoice_already_paid: {
    status: 409,
    userMessage:
      'This invoice is already fully paid. No more receipts can be added against it.',
  },
  amount_out_of_range: {
    status: 400,
    userMessage:
      'The amount is outside the allowed range. Enter a positive value up to ₹1,00,00,000.',
  },

  // ---------------------------------------------------------------
  // Payments (Razorpay)
  // ---------------------------------------------------------------
  payment_signature_invalid: {
    status: 400,
    userMessage:
      'The payment could not be verified. If money was deducted, it will be refunded within 5–7 working days.',
  },
  payment_already_refunded: {
    status: 409,
    userMessage: 'This payment has already been refunded.',
  },

  // ---------------------------------------------------------------
  // RBAC / permissions
  // ---------------------------------------------------------------
  role_cannot_self_demote: {
    status: 403,
    userMessage:
      'You cannot remove your own admin role. Ask another admin to make the change.',
  },
  insufficient_permissions: {
    status: 403,
    userMessage: 'You do not have permission to perform this action.',
  },
} as const satisfies Record<string, ErrorCodeDef>;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Runtime lookup that accepts an arbitrary string (e.g. a code that
 * the server is emitting but a slightly older client doesn't know
 * about yet) and returns the matching def or `undefined`. Prefer
 * this over direct indexing so clients degrade gracefully when new
 * codes ship.
 */
export function lookupErrorCode(
  code: string | undefined,
): ErrorCodeDef | undefined {
  if (!code) return undefined;
  return (ERROR_CODES as Record<string, ErrorCodeDef>)[code];
}
