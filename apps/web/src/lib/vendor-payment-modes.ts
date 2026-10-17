/**
 * How a vendor payment or direct expense is paid. The values are the API's
 * payment modes; NEFT and RTGS are bank transfers, so they are not separate
 * choices (the API still accepts them from older clients).
 */
export const VENDOR_PAYMENT_MODE_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'dd', label: 'DD' },
] as const;

export type VendorPaymentMode = (typeof VENDOR_PAYMENT_MODE_OPTIONS)[number]['value'];
