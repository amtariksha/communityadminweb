import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmailStatusCell, emailStatusText } from './email-status-cell';

const mocks = vi.hoisted(() => ({ post: vi.fn(), toast: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.toast }) }));

const wrap = (ui: React.ReactNode) => render(<>{ui}</>);

afterEach(() => vi.clearAllMocks());

describe('Register e-mail status (INC-31)', () => {
  it('reads the latest outcome, or never e-mailed', () => {
    expect(emailStatusText(null)).toBe('Not e-mailed');
    expect(emailStatusText('skipped_no_email')).toBe('No e-mail address');
    expect(emailStatusText(undefined)).toBe('');
  });

  it('stays empty on an API without e-mail status', () => {
    const { container } = wrap(<EmailStatusCell documentType="invoice" documentId="i1" status={undefined} canSend />);
    expect(container.textContent).toBe('');
  });

  it('e-mails the document again and shows the outcome', async () => {
    mocks.post.mockResolvedValue({ data: [{ status: 'sent', error: null }] });
    wrap(<EmailStatusCell documentType="receipt" documentId="r1" status="failed" canSend />);
    expect(screen.getByText('Failed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'E-mail again' }));
    await vi.waitFor(() => expect(screen.getByText('Sent')).toBeTruthy());
    expect(mocks.post).toHaveBeenCalledWith('/billing-email-log/send', { document_type: 'receipt', document_id: 'r1' });
  });

  it('offers no button to a reader', () => {
    wrap(<EmailStatusCell documentType="invoice" documentId="i1" status={null} canSend={false} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
