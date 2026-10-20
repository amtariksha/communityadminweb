import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnlockDialog } from './unlock-dialog';
import { clearUnlock, liveUnlock, saveUnlock, unlockHeaders } from '@/lib/gate-unlock';

/**
 * GATE-43 "Verify it's you" (GATE-S5): Send Code, six digit boxes, Proceed
 * and a 20-second resend wait; the token is kept until it expires.
 */

describe('UnlockDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends the code, takes six digits and proceeds; resend waits 20 seconds', async () => {
    const requestCode = vi.fn().mockResolvedValue({ sent_to: '••••••0050', resend_after_seconds: 20 });
    const verifyCode = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    render(<UnlockDialog open scope="visitors" onClose={onClose} requestCode={requestCode} verifyCode={verifyCode} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send Code' }));
    });
    expect(requestCode).toHaveBeenCalledWith('visitors');
    expect(screen.getByText(/••••••0050/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Resend in 20s' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.paste(screen.getByLabelText('Digit 1'), { clipboardData: { getData: () => '123456' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    });
    expect(verifyCode).toHaveBeenCalledWith({ scope: 'visitors', code: '123456' });
    expect(onClose).toHaveBeenCalled();
  });

  it('asks for all six digits before sending', async () => {
    const verifyCode = vi.fn();
    render(
      <UnlockDialog
        open
        scope="vehicles"
        onClose={vi.fn()}
        requestCode={vi.fn().mockResolvedValue({ sent_to: '••••••0050', resend_after_seconds: 20 })}
        verifyCode={verifyCode}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send Code' }));
    });
    fireEvent.change(screen.getByLabelText('Digit 1'), { target: { value: '1' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    });
    expect(verifyCode).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('Enter all six digits.');
  });
});

describe('the unlock token', () => {
  it('is sent while it lives and dropped once it expires', () => {
    saveUnlock('visitors', 'tok-1', new Date(Date.now() + 60_000).toISOString());
    expect(unlockHeaders('visitors')).toEqual({ 'x-gate-unlock': 'tok-1' });
    expect(unlockHeaders('vehicles')).toEqual({});
    expect(liveUnlock('visitors', Date.now() + 120_000)).toBeNull();
    expect(unlockHeaders('visitors')).toEqual({});
    clearUnlock('visitors');
  });
});
