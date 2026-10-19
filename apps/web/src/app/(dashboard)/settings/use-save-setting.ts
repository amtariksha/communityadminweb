'use client';

import type { TenantSettings } from '@communityos/shared';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';

type SettingKey = keyof TenantSettings;

/**
 * One Setup card's save of one top-level settings key (sent whole: the save
 * merges top-level keys only). A server that does not know the key drops it
 * and still answers 200; the toast then says the setting is not supported yet.
 */
export function useSaveSetting<K extends SettingKey>(key: K, label: string) {
  const { addToast } = useToast();
  const tenantId = getCurrentTenant() ?? '';
  const tenant = useTenant(tenantId);
  const update = useTenantSettings();
  const saved = tenant.data?.settings_json?.[key] as TenantSettings[K] | undefined;

  function save(value: TenantSettings[K]): void {
    update.mutate(
      { tenant_id: tenantId, settings: { [key]: value } as Partial<TenantSettings> },
      {
        onSuccess: (next) => {
          if (next?.settings_json?.[key] === undefined) {
            addToast({ title: `${label} not saved`, description: 'The server does not support this setting yet.', variant: 'destructive' });
            return;
          }
          addToast({ title: `${label} saved`, variant: 'success' });
        },
        onError: (error) => {
          addToast({ title: `Could not save ${label.toLowerCase()}`, description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
        },
      },
    );
  }

  return { tenantId, tenant, saved, save, saving: update.isPending };
}
