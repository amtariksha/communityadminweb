'use client';
import { type ReactNode } from 'react';

/**
 * Q5: the API sends a resident's number to the gate roles as `••••••1234`.
 * That is shown as text — there is nothing to dial.
 */
export function isMaskedPhone(phone: string): boolean {
  return phone.startsWith('•');
}

export function ClickablePhone({ phone }: { phone: string | null | undefined }): ReactNode {
  if (!phone) return <span className="text-muted-foreground">—</span>;
  if (isMaskedPhone(phone)) return <span className="text-sm tabular-nums">{phone}</span>;
  return <a href={`tel:${phone}`} className="text-primary hover:underline text-sm">{phone}</a>;
}

export function ClickableEmail({ email }: { email: string | null | undefined }): ReactNode {
  if (!email) return <span className="text-muted-foreground">—</span>;
  return <a href={`mailto:${email}`} className="text-primary hover:underline text-sm">{email}</a>;
}
