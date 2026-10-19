import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RunNowControl } from './run-now-control';

const mocks = vi.hoisted(() => ({ post: vi.fn(), toast: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.toast }) }));

afterEach(() => vi.clearAllMocks());

describe('Run now (INC-19)', () => {
  it('asks before billing the month and sends its 1st', async () => {
    mocks.post.mockResolvedValue({ data: { run_id: 'r1', status: 'completed', invoices_created: 3, invoices_posted: 0, units_skipped: 1 } });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RunNowControl />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: /Run now/ }).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('Bill a period now'), { target: { value: '2026-12' } });
    fireEvent.click(screen.getByRole('button', { name: /Run now/ }));
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, raise the invoices' }));
    await vi.waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: '3 invoice(s) raised' })));
    expect(mocks.post).toHaveBeenCalledWith('/billing-runs', { invoice_date: '2026-12-01' });
  });
});
