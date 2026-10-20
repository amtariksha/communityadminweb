'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CreditCard, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canChangeSettings } from './settings-access';
import {
  gatewayChargeErrors,
  readGatewayCharge,
  sameGatewayCharge,
  toGatewayChargePayload,
  type GatewayChargeForm,
} from './gateway-charge';

function savedSentence(form: GatewayChargeForm): string {
  if (!form.absorbed) return `Residents pay the invoice amount plus ${form.percent}%.`;
  const minimum = form.minAmount.trim();
  return minimum
    ? `The society pays the gateway charge on payments of ₹${minimum} or more; smaller payments carry it.`
    : 'The society pays the gateway charge; residents pay the invoice amount.';
}

/**
 * Settings › Online payment charges (INC-12). When a resident pays dues
 * online, the payment gateway's charge is either added to what they pay or
 * borne by the society — on every payment, or only from a minimum amount
 * (INC-43, `billing_gateway`). Applies to orders created after the change.
 */
export function GatewayChargeCard(): ReactNode {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const updateSettings = useTenantSettings();
  const saved = readGatewayCharge(tenantQuery.data?.settings_json);
  const savedKey = JSON.stringify(saved);

  const [form, setForm] = useState<GatewayChargeForm>(saved);

  useEffect(() => {
    setForm(saved);
    // savedKey captures every field of `saved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  if (!tenantId || !canChangeSettings()) return null;

  const errors = gatewayChargeErrors(form);
  const canSave = !sameGatewayCharge(form, saved) && Object.keys(errors).length === 0 && !updateSettings.isPending;

  function save(): void {
    updateSettings.mutate(
      { tenant_id: tenantId, settings: toGatewayChargePayload(form) },
      {
        onSuccess: (tenant) => {
          // A server without these settings drops the keys and still answers 200.
          if (!sameGatewayCharge(readGatewayCharge(tenant?.settings_json), form)) {
            addToast({
              title: 'Online payment charges not saved',
              description: 'The server does not support these settings yet.',
              variant: 'destructive',
            });
            return;
          }
          addToast({
            title: 'Online payment charges saved',
            description: savedSentence(form),
            variant: 'success',
          });
        },
        onError: (error) => {
          addToast({
            title: 'Could not save online payment charges',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card id="online-payment-charges">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Online payment charges
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The payment gateway charges a percentage on each online payment. Either residents pay it
          on top of their dues, or the society bears it. Applies to payments started after you save.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.absorbed}
            onChange={(e) => setForm((prev) => ({ ...prev, absorbed: e.target.checked }))}
            className="rounded border-input"
          />
          Society pays the gateway charge
        </label>

        {form.absorbed && (
          <div className="max-w-xs space-y-2">
            <Label htmlFor="gateway-absorb-min">Absorb only above amount (₹)</Label>
            <Input
              id="gateway-absorb-min"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.minAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, minAmount: e.target.value }))}
            />
            {errors.minAmount ? (
              <p className="text-xs text-destructive">{errors.minAmount}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Payments below this amount carry the charge. Blank: the society pays it on every payment.
              </p>
            )}
          </div>
        )}

        <div className="max-w-xs space-y-2">
          <Label htmlFor="gateway-fee-percent">Gateway charge (%)</Label>
          <Input
            id="gateway-fee-percent"
            type="number"
            inputMode="decimal"
            min={0}
            max={5}
            step="0.01"
            value={form.percent}
            onChange={(e) => setForm((prev) => ({ ...prev, percent: e.target.value }))}
          />
          {errors.percent ? (
            <p className="text-xs text-destructive">{errors.percent}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Added to what residents pay when the society does not pay it.
            </p>
          )}
        </div>

        <Button onClick={save} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettings.isPending ? 'Saving…' : 'Save online payment charges'}
        </Button>
      </CardContent>
    </Card>
  );
}
