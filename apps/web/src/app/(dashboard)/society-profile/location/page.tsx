'use client';

import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocietyProfile } from '@/hooks/use-society-profile';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { LocationEditor } from './location-editor';
import { StoredAddress } from './stored-address';

// PATCH /tenant-settings/profile: address and map point (decision PROF-D6).
const LOCATION_EDITORS = new Set(['super_admin', 'community_admin']);

/** Society Profile › Location (PROF-S3, PROF-20). */
export default function Page(): ReactNode {
  const profile = useSocietyProfile();
  if (profile.isLoading) return <Skeleton className="h-64 w-full" />;
  if (isNotDeployed(profile.error)) return <StoredAddress />;
  if (profile.error || !profile.data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">Could not load the society profile: {friendlyError(profile.error)}</CardContent>
      </Card>
    );
  }
  return <LocationEditor profile={profile.data} canEdit={LOCATION_EDITORS.has(currentRole() ?? '')} />;
}
