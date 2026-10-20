'use client';

import { type FormEvent, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { currentRole } from '@/lib/current-role';

// The roles PATCH /tenant-settings/gate and the gate grids accept (GATE-03).
const GATE_SETUP_WRITE_ROLES = new Set(['super_admin', 'community_admin', 'committee_member', 'security_supervisor']);

/** Whether the signed-in user may save Gate & Visitors › Setup (the API re-checks). */
export function canWriteGateSetup(): boolean {
  const role = currentRole();
  return role !== null && GATE_SETUP_WRITE_ROLES.has(role);
}

interface SetupBlockProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** One block of the Setup page (GATE-S1): its own card and its own Save. */
export function SetupBlock({ title, description, children }: SetupBlockProps): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface BlockFormProps {
  children: ReactNode;
  editable: boolean;
  dirty: boolean;
  saving: boolean;
  /** The error of the last save, kept inside the block (typed values stay). */
  error: string | null;
  onSave: () => void;
}

/** A block's fields with its Save button and its own error line. */
export function BlockForm({ children, editable, dirty, saving, error, onSave }: BlockFormProps): ReactNode {
  function submit(event: FormEvent): void {
    event.preventDefault();
    onSave();
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {editable ? (
        <Button type="submit" size="sm" disabled={!dirty || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      ) : null}
    </form>
  );
}

/** The line a block shows when the API does not have its settings yet. */
export function NotAvailableYet({ what }: { what: string }): ReactNode {
  return <p className="text-sm text-muted-foreground">{what} are not available yet.</p>;
}
