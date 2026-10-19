'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useTenant, useUpdateTenant } from '@/hooks';
import { useUpdateSocietyProfile } from '@/hooks/use-society-profile';
import { friendlyError } from '@/lib/api-error';
import { getCurrentTenant } from '@/lib/auth';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';

interface InfoValues {
  name: string;
  address: string;
  city: string;
  state: string;
}

const FIELDS: ReadonlyArray<[keyof Omit<InfoValues, 'name'>, string]> = [
  ['address', 'Address'],
  ['city', 'City'],
  ['state', 'State'],
];

/** Who may edit what: the super admin everything, the community admin all but the name (PROF-20). */
export function societyInfoAccess(role: string | null): { name: boolean; address: boolean } {
  if (role === 'super_admin') return { name: true, address: true };
  return { name: false, address: role === 'community_admin' };
}

function useSaveSocietyInfo(tenantId: string, canEditName: boolean) {
  const { addToast } = useToast();
  const updateTenant = useUpdateTenant();
  const updateProfile = useUpdateSocietyProfile();
  const onError = (error: unknown) =>
    addToast({
      title: 'Failed to update',
      description: isNotDeployed(error) ? 'Editing the society address is not available yet.' : friendlyError(error),
      variant: 'destructive',
    });
  const onSuccess = () => addToast({ title: 'Society info updated', variant: 'success' });
  function save(values: InfoValues): void {
    const address = { address: values.address.trim(), city: values.city.trim(), state: values.state.trim() };
    if (canEditName) updateTenant.mutate({ id: tenantId, data: { name: values.name, ...address } }, { onSuccess, onError });
    else updateProfile.mutate(address, { onSuccess, onError });
  }
  return { save, saving: updateTenant.isPending || updateProfile.isPending };
}

/**
 * Settings › Society Information. The community admin now fixes the
 * society's address here (through the profile route, PROF-20); the name
 * stays with the platform team.
 */
export function SocietyInfoCard(): ReactNode {
  const tenantId = getCurrentTenant() ?? '';
  const tenantQuery = useTenant(tenantId);
  const access = societyInfoAccess(currentRole());
  const { save, saving } = useSaveSocietyInfo(tenantId, access.name);
  const [values, setValues] = useState<InfoValues>({ name: '', address: '', city: '', state: '' });
  const tenant = tenantQuery.data;

  useEffect(() => {
    if (tenant) setValues({ name: tenant.name ?? '', address: tenant.address ?? '', city: tenant.city ?? '', state: tenant.state ?? '' });
  }, [tenant]);

  function submit(event: FormEvent): void {
    event.preventDefault();
    save(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Society Information</CardTitle>
      </CardHeader>
      <CardContent>
        {tenantQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="society-name">Society Name</Label>
              <Input id="society-name" required value={values.name} readOnly={!access.name} disabled={!access.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {FIELDS.map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`society-${key}`}>{label}</Label>
                  <Input
                    id={`society-${key}`}
                    required
                    value={values[key]}
                    readOnly={!access.address}
                    disabled={!access.address}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            {access.address ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{access.name ? '' : 'The society name is changed by the platform team.'}</p>
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Society Info'}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Society details are changed by the community admin.</p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
