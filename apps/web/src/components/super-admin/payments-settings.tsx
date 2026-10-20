'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  usePaymentProviderSettings,
  useUpdatePaymentProviderSettings,
  type PaymentProviderSettings,
  type PaymentSettingState,
} from '@/hooks/use-payment-provider';
import { friendlyError } from '@/lib/api-error';

const STATE_TEXT: Record<PaymentSettingState, string> = {
  saved: 'Set (saved here)',
  environment: 'Set (server environment)',
  not_set: 'Not set',
};

function SecretField({ id, label, state, value, onChange }: {
  id: string;
  label: string;
  state: PaymentSettingState;
  value: string;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs text-muted-foreground" data-testid={`${id}-state`}>
        {STATE_TEXT[state]}
      </p>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={state === 'not_set' ? 'Enter to set' : 'Leave blank to keep the one in use'}
      />
    </div>
  );
}

function PaymentsForm({ settings }: { settings: PaymentProviderSettings }): ReactNode {
  const { addToast } = useToast();
  const update = useUpdatePaymentProviderSettings();
  const [keyId, setKeyId] = useState(settings.keyId);
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [fee, setFee] = useState(String(settings.platformFeePercent));

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    update.mutate(
      {
        keyId: keyId.trim(),
        ...(keySecret ? { keySecret } : {}),
        ...(webhookSecret ? { webhookSecret } : {}),
        ...(fee.trim() === '' ? {} : { platformFeePercent: Number(fee) }),
      },
      {
        onSuccess() {
          setKeySecret('');
          setWebhookSecret('');
          addToast({ title: 'Payment settings saved', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} aria-label="Razorpay">
      <p className="text-sm text-muted-foreground">
        The Razorpay account every society&apos;s payments use. Saved values take over from the server
        environment once a key id is saved; secrets are never shown.
      </p>
      <div className="space-y-2">
        <Label htmlFor="payments-key-id">Key ID</Label>
        <p className="text-xs text-muted-foreground" data-testid="payments-key-id-state">
          {STATE_TEXT[settings.keyIdSource]}
        </p>
        <Input id="payments-key-id" value={keyId} onChange={(event) => setKeyId(event.target.value)} placeholder="rzp_live_..." />
      </div>
      <SecretField id="payments-key-secret" label="Key Secret" state={settings.keySecret} value={keySecret} onChange={setKeySecret} />
      <SecretField
        id="payments-webhook-secret"
        label="Webhook Secret"
        state={settings.webhookSecret}
        value={webhookSecret}
        onChange={setWebhookSecret}
      />
      <div className="space-y-2">
        <Label htmlFor="payments-fee">Platform Fee %</Label>
        <Input
          id="payments-fee"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={fee}
          onChange={(event) => setFee(event.target.value)}
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={update.isPending || keyId.trim() === ''}>
          {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {update.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

/** Super admin › Platform settings › Payments (Q2). */
export function PaymentsSettings(): ReactNode {
  const query = usePaymentProviderSettings();

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.isError) {
    return <p className="text-sm text-destructive">Could not load the payment settings: {friendlyError(query.error)}</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Payment settings are not available yet on this server.</p>;
  }
  return <PaymentsForm key={JSON.stringify(query.data)} settings={query.data} />;
}
