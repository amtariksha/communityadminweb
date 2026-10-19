'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Percent, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canChangeSettings } from './settings-access';

/** Saved value of Setup › GST: the option is on unless switched off. */
export function readShowGstOnAdhoc(settings: unknown): boolean {
  const gst = (settings as { billing_gst?: { show_on_adhoc?: unknown } } | null | undefined)?.billing_gst;
  return gst?.show_on_adhoc !== false;
}

/**
 * Settings › GST on ad-hoc invoices (INC-23, classic Setup › GST). When on,
 * Post Invoice for a unit offers Apply GST; when off the form hides it and
 * the API refuses GST on such an invoice.
 */
export function BillingGstCard(): ReactNode {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const updateSettings = useTenantSettings();
  const saved = readShowGstOnAdhoc(tenantQuery.data?.settings_json);
  const [showGst, setShowGst] = useState(saved);

  useEffect(() => setShowGst(saved), [saved]);

  if (!tenantId || !canChangeSettings()) return null;

  function save(): void {
    updateSettings.mutate(
      { tenant_id: tenantId, settings: { billing_gst: { show_on_adhoc: showGst } } },
      {
        onSuccess: (tenant) => {
          // A server without this setting drops the key and still answers 200.
          const stored = (tenant?.settings_json as { billing_gst?: unknown } | undefined)?.billing_gst;
          if (stored === undefined) {
            addToast({ title: 'GST option not saved', description: 'The server does not support this setting yet.', variant: 'destructive' });
            return;
          }
          addToast({ title: 'GST option saved', variant: 'success' });
        },
        onError: (error) =>
          addToast({ title: 'Could not save the GST option', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' }),
      },
    );
  }

  return (
    <Card id="billing-gst">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          GST on ad-hoc invoices
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Whether Post Invoice for a unit offers to add GST. HSN/SAC codes are set per income account.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={showGst} onChange={(e) => setShowGst(e.target.checked)} className="rounded border-input" />
          Show the GST option when posting an ad-hoc invoice
        </label>
        <Button onClick={save} disabled={showGst === saved || updateSettings.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettings.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
