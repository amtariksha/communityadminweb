/**
 * Date helpers for financial posting-date defaults.
 *
 * `new Date().toISOString().slice(0, 10)` yields a UTC date, which for a
 * Bangalore user after ~18:30 IST rolls forward to *tomorrow* (or, before
 * 05:30 IST, could resolve to yesterday relative to their wall clock). For
 * financial documents (journal entries, receipts, debit notes, invoices) the
 * default posting date must match the operator's local (IST) calendar day.
 *
 * `en-CA` formats as `YYYY-MM-DD`, matching the shape of `<input type="date">`.
 */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(new Date());
}
