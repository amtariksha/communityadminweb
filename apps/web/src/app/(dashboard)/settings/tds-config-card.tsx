'use client';

import { type ReactNode } from 'react';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useTdsConfig,
  useUpdateTenantTdsConfig,
  type TdsConfig,
} from '@/hooks';
import { TdsConfigEditor } from '@/components/tds/tds-config-editor';

/**
 * Per-tenant TDS override card on the Community Admin → Settings page.
 *
 * - When source = "platform" the form shows the inherited platform
 *   default and saving creates the override.
 * - When source = "tenant" the form shows the live override; "Reset to
 *   platform default" wipes it and falls back to the platform values.
 *
 * Why a separate card (vs. living inside the existing tenant-settings
 * PATCH): keeps the TDS save path identical to the super-admin path
 * (both PATCH the same kind of config object), and avoids deep-merge
 * surprises in `tenants.settings_json` for nested objects.
 */
export function TdsConfigCard(): ReactNode {
  const { addToast } = useToast();
  const tdsQuery = useTdsConfig();
  const updateMutation = useUpdateTenantTdsConfig();

  const data = tdsQuery.data;
  const config: TdsConfig | null = data?.config ?? null;
  const source = data?.source ?? 'platform';

  function handleSave(cfg: TdsConfig): void {
    updateMutation.mutate(
      { config: cfg },
      {
        onSuccess() {
          addToast({
            title: 'TDS configuration saved',
            description:
              source === 'tenant'
                ? 'Your tenant override has been updated.'
                : 'A tenant override has been created.',
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to save TDS configuration',
            description: err.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleReset(): void {
    updateMutation.mutate(
      { config: null },
      {
        onSuccess() {
          addToast({
            title: 'Reverted to platform default',
            description:
              "This society's TDS rules now match the platform default.",
            variant: 'success',
          });
        },
        onError(err) {
          addToast({
            title: 'Failed to reset TDS configuration',
            description: err.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          TDS Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tdsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : tdsQuery.isError ? (
          <p className="text-sm text-destructive">
            Failed to load TDS configuration:{' '}
            {(tdsQuery.error as Error)?.message ?? 'unknown error'}
          </p>
        ) : (
          <TdsConfigEditor
            value={config}
            onSave={handleSave}
            // Only show "Reset" when there's an override to clear.
            // Without an override the platform default is already
            // active — there's nothing to reset.
            onReset={source === 'tenant' ? handleReset : undefined}
            isPending={updateMutation.isPending}
            isResetPending={updateMutation.isPending}
            sourceLabel={
              source === 'tenant'
                ? 'Custom for this society — overrides platform default. Click "Reset" to revert.'
                : 'Inheriting platform default. Saving will create a society-specific override.'
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
