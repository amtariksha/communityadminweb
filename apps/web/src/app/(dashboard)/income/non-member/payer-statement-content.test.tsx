import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatementFilters, UnitStatement } from '@/hooks/use-unit-statement';
import { ApiError } from '@/lib/api-error';
import { PayerStatementContent } from './payer-statement-content';

/**
 * INC-46 — a non-member payer's account statement: the unit statement's
 * screen with Current Due and the two statements only, the payer's name,
 * its own file route and no Auto Allocate.
 */

const mocks = vi.hoisted(() => ({
  tab: null as string | null,
  access: { canRead: true, canWrite: true },
  calls: [] as StatementFilters[],
  result: { data: null as unknown, error: null as unknown, refetch: vi.fn() },
  download: vi.fn().mockResolvedValue(new Blob(['x'])),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/income/non-member/payers/c-1/statement',
  useSearchParams: () => ({ get: () => mocks.tab }),
}));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => mocks.access }));
vi.mock('@/hooks/use-payer-ledger', () => ({
  usePayerStatement: (_id: string, filters: StatementFilters) => {
    mocks.calls.push(filters);
    return mocks.result;
  },
  usePayerOpenBills: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('@/hooks/use-unit-statement', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-unit-statement')>()),
  useAllocations: () => ({ data: { links: [] }, isLoading: false, error: null }),
  useReallocateFifo: () => ({ mutate: vi.fn(), isPending: false }),
  useEditInvoiceDetails: () => ({ mutate: vi.fn(), isPending: false }),
  useEditReceiptDetails: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/use-invoices', () => ({ useCancelInvoice: () => ({ mutate: vi.fn() }), useWaiveInterest: () => ({ mutate: vi.fn() }), useInvoice: () => ({ data: null }) }));
vi.mock('@/hooks/use-receipts', () => ({ useReceipt: () => ({ data: null }), useAdvances: () => ({ data: { data: [] } }) }));
vi.mock('@/hooks/use-receipt-void', () => ({ useVoidReceipt: () => ({ mutate: vi.fn() }) }));
vi.mock('@/hooks/use-billing-email', () => ({ useSendStatementEmail: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }) }));
vi.mock('@/hooks/use-units', () => ({ useUnitMembers: () => ({ data: [] }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: { download: mocks.download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn() }));

function statement(): UnitStatement {
  return {
    unit: { id: 'c-1', unit_number: 'Sunrise Events', block: null },
    payer: { id: 'c-1', name: 'Sunrise Events' },
    from: '2026-04-01',
    to: '2026-10-20',
    scope: 'all',
    view: 'admin',
    show_reversals: false,
    summary: { current_due: 11800, current_advances: 0, refundable_deposit: 0 },
    opening: 0,
    rows: [
      {
        doc_type: 'invoice',
        doc_id: 'i-1',
        date: '2026-10-02',
        posted_by: 'Treasurer',
        invoice_id: 'i-1',
        invoice_no: 'NM-0001',
        receipt_no: null,
        account: 'Hall Hire',
        description: 'Hall booking',
        due: 11800,
        paid: 0,
        balance: 11800,
        reversal: false,
        actions: ['view_allocation'],
      },
    ],
    totals: { due: 11800, paid: 0, net: 11800 },
  };
}

function renderPage(): void {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  render(<PayerStatementContent customerId="c-1" />, { wrapper });
}

describe('payer statement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tab = null;
    mocks.access = { canRead: true, canWrite: true };
    mocks.calls = [];
    mocks.result = { data: statement(), error: null, refetch: vi.fn() };
  });

  it("titles the payer and offers Current Due and the two statements only", () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Account Statement for Sunrise Events' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Current Due (₹11,800)' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Current Advances/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Refundable Deposit/ })).toBeNull();
    expect(screen.getByRole('link', { name: "Payer's Account Statement" })).toBeTruthy();
    expect(mocks.calls[mocks.calls.length - 1]).toMatchObject({ scope: 'all', view: 'admin' });
  });

  it("downloads from the payer's statement route and has no Auto Allocate", () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    expect(mocks.download).toHaveBeenCalledWith('/unit-ledger/customers/c-1/statement', { params: expect.objectContaining({ format: 'csv', scope: 'all' }) });
    expect(screen.queryByRole('button', { name: 'Auto Allocate on FiFo Basis' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Close' }).getAttribute('href')).toBe('/income/non-member');
  });

  it('falls back to the admin statement for a tab a payer does not have', () => {
    mocks.tab = 'deposit';
    renderPage();

    expect(screen.getByRole('link', { name: "Admin's Account Statement" }).getAttribute('aria-current')).toBe('page');
  });

  it('says the statement is not available yet when the route is missing', () => {
    mocks.result = { data: undefined, error: new ApiError(404, { statusCode: 404, message: 'Cannot GET' } as never), refetch: vi.fn() };
    renderPage();

    expect(screen.getByText('The account statement is not available yet on this server.')).toBeTruthy();
  });
});
