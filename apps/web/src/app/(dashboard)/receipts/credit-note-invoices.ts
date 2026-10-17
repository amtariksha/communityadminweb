const CREDITABLE_STATUSES = new Set(['sent', 'partially_paid', 'overdue']);

interface InvoiceForCreditNote {
  status: string;
  balance_due: number | string;
}

/**
 * Invoices a credit note can be raised against: posted and still owing.
 * A draft has nothing to reverse (cancel it instead), a cancelled or paid
 * invoice has nothing left to credit. The API refuses the rest as well.
 */
export function creditableInvoices<T extends InvoiceForCreditNote>(invoices: readonly T[]): T[] {
  return invoices.filter(
    (invoice) => CREDITABLE_STATUSES.has(invoice.status) && Number(invoice.balance_due) > 0,
  );
}
