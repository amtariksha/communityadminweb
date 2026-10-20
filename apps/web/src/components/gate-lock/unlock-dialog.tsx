'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { friendlyError } from '@/lib/api-error';
import type { UnlockScope } from '@/lib/gate-unlock';

const DIGITS = 6;

interface UnlockDialogProps {
  open: boolean;
  scope: UnlockScope;
  onClose: () => void;
  requestCode: (scope: UnlockScope) => Promise<{ sent_to: string; resend_after_seconds: number }>;
  verifyCode: (input: { scope: UnlockScope; code: string }) => Promise<unknown>;
}

/** "Verify it's you" (GATE-S5): Send Code, six boxes, Proceed, a 20-second resend wait. */
export function UnlockDialog({ open, scope, onClose, requestCode, verifyCode }: UnlockDialogProps): ReactNode {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        {open && <UnlockSteps scope={scope} onClose={onClose} requestCode={requestCode} verifyCode={verifyCode} />}
      </DialogContent>
    </Dialog>
  );
}

function UnlockSteps({ scope, onClose, requestCode, verifyCode }: Omit<UnlockDialogProps, 'open'>): ReactNode {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function send(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const sent = await requestCode(scope);
      setSentTo(sent.sent_to);
      setWait(sent.resend_after_seconds);
      boxes.current[0]?.focus();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  }

  async function proceed(): Promise<void> {
    const code = digits.join('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter all six digits.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyCode({ scope, code });
      onClose();
    } catch (failure) {
      setError(friendlyError(failure));
      setDigits(Array(DIGITS).fill(''));
    } finally {
      setBusy(false);
    }
  }

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigits((current) => current.map((old, i) => (i === index ? digit : old)));
    if (digit && index < DIGITS - 1) boxes.current[index + 1]?.focus();
  };
  const onKey = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) boxes.current[index - 1]?.focus();
  };
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    if (pasted.length === 0) return;
    event.preventDefault();
    setDigits(Array.from({ length: DIGITS }, (_, i) => pasted[i] ?? ''));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Verify it’s you</DialogTitle>
      </DialogHeader>
      <p className="mt-2 text-sm text-muted-foreground">
        {sentTo
          ? `We sent a six-digit code to ${sentTo}. It opens the ${scope === 'visitors' ? 'visitor' : 'vehicle'} log for 15 minutes.`
          : `The ${scope === 'visitors' ? 'visitor' : 'vehicle'} log is locked. We will send a one-time code to your phone.`}
      </p>
      {sentTo && (
        <div className="mt-4 flex gap-2" role="group" aria-label="Code">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                boxes.current[index] = element;
              }}
              aria-label={`Digit ${index + 1}`}
              inputMode="numeric"
              maxLength={1}
              className="h-10 w-10 rounded border border-input bg-background text-center text-lg"
              value={digit}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => onKey(index, event)}
              onPaste={onPaste}
            />
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {sentTo && (
          <Button type="button" variant="outline" disabled={busy || wait > 0} onClick={() => void send()}>
            {wait > 0 ? `Resend in ${wait}s` : 'Resend Code'}
          </Button>
        )}
        {sentTo ? (
          <Button type="button" disabled={busy} onClick={() => void proceed()}>
            Proceed
          </Button>
        ) : (
          <Button type="button" disabled={busy} onClick={() => void send()}>
            Send Code
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
