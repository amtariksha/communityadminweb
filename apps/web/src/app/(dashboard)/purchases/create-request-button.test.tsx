import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConvertToInvoiceButton, CreatePurchaseRequestButton } from './create-request-button';

/** Standard /purchases: Create PR and Convert open the forms with lines; the old one-amount dialogs are gone. */

vi.mock('./purchase-request-form', () => ({ PurchaseRequestForm: () => <div>purchase request form</div> }));
vi.mock('./vendor-invoice/vendor-invoice-form', () => ({
  VendorInvoiceForm: ({ fromRequestId }: { fromRequestId?: string }) => <div>vendor invoice form for {fromRequestId}</div>,
}));

describe('purchase request buttons', () => {
  it('Create PR opens the purchase request form with lines', () => {
    render(<CreatePurchaseRequestButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Create PR' }));
    expect(screen.getByText('purchase request form')).toBeTruthy();
  });

  it('Convert opens the vendor invoice form filled from the request', () => {
    render(<ConvertToInvoiceButton requestId="pr-7" />);
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }));
    expect(screen.getByText('vendor invoice form for pr-7')).toBeTruthy();
  });
});
