'use client';
import { type ReactNode } from 'react';

export function ClickablePhone({ phone }: { phone: string | null | undefined }): ReactNode {
  if (!phone) return <span className="text-muted-foreground">—</span>;
  return <a href={`tel:${phone}`} className="text-primary hover:underline text-sm">{phone}</a>;
}

export function ClickableEmail({ email }: { email: string | null | undefined }): ReactNode {
  if (!email) return <span className="text-muted-foreground">—</span>;
  return <a href={`mailto:${email}`} className="text-primary hover:underline text-sm">{email}</a>;
}
