'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FileText, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';
import { canChangeSettings } from './settings-access';
import {
  readTaxRegistration,
  sameTaxRegistration,
  taxRegistrationErrors,
  toTaxRegistrationPayload,
  type TaxRegistrationForm,
} from './tax-registration';

/**
 * Settings › Tax registration (INC-11): the society's GSTIN, PAN and
 * registration number, printed on its invoices, receipts and credit notes
 * and carried into the GSTR-1 export. The community admin can change them.
 */
export function TaxRegistrationCard(): ReactNode {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const updateSettings = useTenantSettings();
  const saved = readTaxRegistration(tenantQuery.data?.settings_json);
  const savedKey = JSON.stringify(saved);

  const [form, setForm] = useState<TaxRegistrationForm>(saved);

  useEffect(() => {
    setForm(saved);
    // savedKey captures every field of `saved`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  if (!tenantId || !canChangeSettings()) return null;

  const errors = taxRegistrationErrors(form);
  const canSave =
    !sameTaxRegistration(form, saved) && Object.keys(errors).length === 0 && !updateSettings.isPending;

  function change(key: keyof TaxRegistrationForm, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save(): void {
    const payload = toTaxRegistrationPayload(form);
    updateSettings.mutate(
      { tenant_id: tenantId, settings: payload },
      {
        onSuccess: (tenant) => {
          // A server without these settings drops the keys and still answers 200.
          const stored = readTaxRegistration(tenant?.settings_json);
          if (!sameTaxRegistration(stored, form)) {
            addToast({
              title: 'Tax registration not saved',
              description: 'The server does not support these settings yet.',
              variant: 'destructive',
            });
            return;
          }
          addToast({
            title: 'Tax registration saved',
            description: 'New invoices, receipts and credit notes carry it.',
            variant: 'success',
          });
        },
        onError: (error) => {
          addToast({
            title: 'Could not save tax registration',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card id="tax-registration">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tax registration
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Printed under the society&apos;s name on invoices, receipts and credit notes, and used in the
          GSTR-1 export. Leave a field blank if the society has none.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="tax-gstin">GSTIN</Label>
            <Input
              id="tax-gstin"
              maxLength={15}
              placeholder="29ABCDE1234F1Z5"
              value={form.gstin}
              onChange={(e) => change('gstin', e.target.value.toUpperCase())}
            />
            {errors.gstin && <p className="text-xs text-destructive">{errors.gstin}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-pan">PAN</Label>
            <Input
              id="tax-pan"
              maxLength={10}
              placeholder="ABCDE1234F"
              value={form.pan}
              onChange={(e) => change('pan', e.target.value.toUpperCase())}
            />
            {errors.pan && <p className="text-xs text-destructive">{errors.pan}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-registration-no">Society registration no.</Label>
            <Input
              id="tax-registration-no"
              maxLength={50}
              value={form.society_registration_no}
              onChange={(e) => change('society_registration_no', e.target.value)}
            />
            {errors.society_registration_no && (
              <p className="text-xs text-destructive">{errors.society_registration_no}</p>
            )}
          </div>
        </div>

        <Button onClick={save} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettings.isPending ? 'Saving…' : 'Save tax registration'}
        </Button>
      </CardContent>
    </Card>
  );
}
