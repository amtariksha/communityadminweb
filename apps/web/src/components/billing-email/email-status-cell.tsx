'use client';

import { useState, type ReactNode } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { ApiError, friendlyError } from '@/lib/api-error';

const LABEL: Record<string, string> = {
  queued: 'Queued',
  sent: 'Sent',
  failed: 'Failed',
  skipped_no_email: 'No e-mail address',
  skipped_disabled: 'Turned off',
};

/** A register's "E-mail status" text: never e-mailed, or the latest outcome. */
export function emailStatusText(status: string | null | undefined): string {
  if (status === undefined) return '';
  return status === null ? 'Not e-mailed' : LABEL[status] ?? status;
}

interface EmailStatusCellProps {
  documentType: 'invoice' | 'receipt' | 'credit_note';
  documentId: string;
  /** `undefined` on an API older than INC-31: the cell stays empty. */
  status: string | null | undefined;
  canSend: boolean;
}

/** E-mail status and "E-mail again" for one document on a register (INC-31). */
export function EmailStatusCell({ documentType, documentId, status, canSend }: EmailStatusCellProps): ReactNode {
  const { addToast } = useToast();
  const [current, setCurrent] = useState(status);
  const [sending, setSending] = useState(false);
  if (status === undefined) return null;

  async function again(): Promise<void> {
    setSending(true);
    try {
      const rows = (
        await api.post<{ data: Array<{ status: string; error: string | null }> }>('/billing-email-log/send', {
          document_type: documentType,
          document_id: documentId,
        })
      ).data;
      const delivered = rows.filter((row) => row.status === 'sent').length;
      setCurrent(rows.at(-1)?.status ?? current);
      addToast({
        title: delivered > 0 ? `E-mailed to ${delivered} recipient(s)` : 'Not e-mailed',
        description: delivered > 0 ? undefined : rows[0]?.error === 'transport_disabled' ? 'E-mail is not configured on the server.' : rows[0]?.error ?? undefined,
        variant: delivered > 0 ? 'success' : 'destructive',
      });
    } catch (error) {
      const missing = error instanceof ApiError && error.status === 404 && error.code !== 'billing_email_no_recipient';
      addToast({ title: 'Could not e-mail', description: missing ? 'E-mail again is not available yet on this server.' : friendlyError(error), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={current === 'failed' ? 'text-destructive' : 'text-muted-foreground'}>{emailStatusText(current)}</span>
      {canSend && (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" title="E-mail again" aria-label="E-mail again" disabled={sending} onClick={() => void again()}>
          <Mail className="h-3.5 w-3.5" />
        </Button>
      )}
    </span>
  );
}
