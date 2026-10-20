'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { AmenitySettings } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAmenitySettings, useSaveAmenitySettings } from '@/hooks/use-amenity-setup';
import { ApiError, friendlyError } from '@/lib/api-error';

type Restrictions = Pick<AmenitySettings, 'block_defaulters' | 'restrict_owner_when_tenanted'>;

function Choice({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }): ReactNode {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name="block-defaulters" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

function RestrictionFields({ value, set }: { value: Restrictions; set: (patch: Partial<Restrictions>) => void }): ReactNode {
  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Block defaulters from reserving amenities?</legend>
        <Choice checked={!value.block_defaulters} onChange={() => set({ block_defaulters: false })}>
          No, Allow All Residents
        </Choice>
        <Choice checked={value.block_defaulters} onChange={() => set({ block_defaulters: true })}>
          Yes, Block Defaulters
        </Choice>
        <p className="text-xs text-muted-foreground">A defaulter&apos;s flat has a posted bill past its due date with something left to pay.</p>
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={value.restrict_owner_when_tenanted} onChange={(e) => set({ restrict_owner_when_tenanted: e.target.checked })} />
        <span>
          Restrict owner bookings for occupied units
          <span className="block text-xs text-muted-foreground">An owner whose flat is let to a current tenant cannot reserve; the tenant can.</span>
        </span>
      </label>
      <p className="text-xs text-muted-foreground">Both apply to residents booking for themselves; the committee can always reserve for a flat.</p>
    </div>
  );
}

/**
 * Amenity & Event › Setup › Restrictions (AMEN-41, screen AMEN-S5): block
 * defaulters, and owners of let flats, from reserving. Saved with
 * PATCH /tenant-settings/amenity; "not available yet" on an older API.
 */
export function RestrictionsContent(): ReactNode {
  const { addToast } = useToast();
  const settings = useAmenitySettings();
  const save = useSaveAmenitySettings();
  const [value, setValue] = useState<Restrictions | null>(null);

  useEffect(() => {
    if (settings.data) {
      setValue({ block_defaulters: settings.data.block_defaulters, restrict_owner_when_tenanted: settings.data.restrict_owner_when_tenanted });
    }
  }, [settings.data]);

  if (settings.isLoading) return <Skeleton className="h-40 w-full" />;
  if (settings.error || !value) {
    const notYet = settings.error instanceof ApiError && settings.error.status === 404;
    return <p className="text-sm text-muted-foreground">{notYet ? 'Restrictions are not available yet on this server.' : 'The restrictions could not be loaded.'}</p>;
  }

  async function onSave(): Promise<void> {
    if (!value) return;
    try {
      await save.mutateAsync(value);
      addToast({ title: 'Restrictions saved', variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the restrictions', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <RestrictionFields value={value} set={(patch) => setValue({ ...value, ...patch })} />
        <Button onClick={() => void onSave()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
