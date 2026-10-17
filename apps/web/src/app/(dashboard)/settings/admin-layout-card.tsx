'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useTenant, useTenantSettings } from '@/hooks/use-tenants';
import { authKeys } from '@/hooks/use-auth';
import { getCurrentTenant, getUser, syncSocietyBranding } from '@/lib/auth';
import { normalizeAdminLayout, storeLayout, type AdminLayout } from '@/lib/admin-layout';

// Matches PATCH /tenants/:id/settings, which allows only these.
function canChangeLayout(): boolean {
  const user = getUser();
  if (user?.isSuperAdmin) return true;
  const tenantId = getCurrentTenant();
  return user?.societies.find((s) => s.id === tenantId)?.role === 'community_admin';
}

const OPTIONS: Array<{ value: AdminLayout; title: string; description: string }> = [
  {
    value: 'standard',
    title: 'Standard',
    description: 'Today’s admin panel: grouped menu, roomy pages, dialogs for forms.',
  },
  {
    value: 'classic',
    title: 'Classic',
    description:
      'A module menu with each module’s screens beneath it, denser pages and committee wording.',
  },
];

function rememberForThisUser(tenantId: string, layout: AdminLayout): void {
  storeLayout(tenantId, layout);
  const user = getUser();
  if (!user) return;
  syncSocietyBranding(
    user.societies.map((s) => (s.id === tenantId ? { ...s, admin_layout: layout } : s)),
  );
}

/**
 * Settings › Admin layout (requirements SB-01). Society-wide: everyone
 * in the society sees the chosen layout on their next page load.
 */
export function AdminLayoutCard(): ReactNode {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const updateSettings = useTenantSettings();
  const saved = normalizeAdminLayout(tenantQuery.data?.settings_json?.admin_layout);
  const [choice, setChoice] = useState<AdminLayout>(saved);

  useEffect(() => setChoice(saved), [saved]);

  if (!tenantId || !canChangeLayout()) return null;

  function save(): void {
    updateSettings.mutate(
      { tenant_id: tenantId, settings: { admin_layout: choice } },
      {
        onSuccess: (tenant) => {
          // A server without this setting drops the key and still answers 200.
          if (normalizeAdminLayout(tenant?.settings_json?.admin_layout) !== choice) {
            addToast({
              title: 'Layout not saved',
              description: 'The server does not support this setting yet.',
              variant: 'destructive',
            });
            return;
          }
          rememberForThisUser(tenantId, choice);
          void queryClient.invalidateQueries({ queryKey: authKeys.me });
          addToast({
            title: 'Admin layout saved',
            description: 'Applies to everyone in this society on their next page load.',
            variant: 'success',
          });
        },
        onError: (error) => {
          addToast({
            title: 'Could not save the layout',
            description: error instanceof Error ? error.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" />
          Admin layout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Admin layout</legend>
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
            >
              <input
                type="radio"
                name="admin-layout"
                value={option.value}
                checked={choice === option.value}
                onChange={() => setChoice(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">{option.title}</span>
                <span className="block text-sm text-muted-foreground">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button onClick={save} disabled={choice === saved || updateSettings.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettings.isPending ? 'Saving…' : 'Save layout'}
        </Button>
      </CardContent>
    </Card>
  );
}
