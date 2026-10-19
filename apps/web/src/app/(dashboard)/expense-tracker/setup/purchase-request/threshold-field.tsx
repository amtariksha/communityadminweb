'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { friendlyError } from '@/lib/api-error';
import { getCurrentTenant } from '@/lib/auth';

/** The error for a typed threshold, or null. 0 = never auto-approve. */
export function thresholdError(text: string): string | null {
  const value = Number(text);
  if (text.trim() === '' || !Number.isFinite(value) || value < 0) return 'Enter an amount of 0 or more.';
  if (!/^\d+(\.\d{1,2})?$/.test(text.trim())) return 'At most two decimals.';
  return null;
}

/**
 * "Auto-approve requests up to (₹)" — the existing setting
 * `pr_approval_threshold`, read when a request is sent (EXP-S2).
 */
export function ThresholdField({ canEdit }: { canEdit: boolean }): ReactNode {
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const save = useTenantSettings();
  const { addToast } = useToast();
  const stored = (tenantQuery.data?.settings_json as Record<string, unknown> | undefined)?.pr_approval_threshold;
  const [text, setText] = useState('0');

  useEffect(() => {
    if (typeof stored === 'number') setText(String(stored));
  }, [stored]);

  const error = thresholdError(text);
  const onSave = () =>
    save.mutate(
      { tenant_id: tenantId, settings: { pr_approval_threshold: Number(text) } as never },
      {
        onSuccess: () => addToast({ title: 'Auto-approve limit saved', variant: 'success' }),
        onError: (failure) => addToast({ title: 'Could not save', description: friendlyError(failure), variant: 'destructive' }),
      },
    );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="pr-threshold">Auto-approve requests up to (₹)</Label>
        <Input id="pr-threshold" type="number" min={0} step="0.01" className="w-40" value={text} disabled={!canEdit} onChange={(e) => setText(e.target.value)} />
        <p className="text-xs text-muted-foreground">0 = never auto-approve.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      {canEdit && (
        <Button type="button" variant="outline" disabled={Boolean(error) || save.isPending} onClick={onSave}>
          Save
        </Button>
      )}
    </div>
  );
}
