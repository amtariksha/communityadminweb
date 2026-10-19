'use client';

import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocietyProfile } from '@/hooks/use-society-profile';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { PROFILE_ADMIN_EDITORS, PROFILE_CONTENT_EDITORS } from '../profile-pictures';
import { ProfileImages } from './profile-images';

/** Society Profile › Images (PROF-S2, PROF-22). */
export default function Page(): ReactNode {
  const profile = useSocietyProfile();
  const role = currentRole() ?? '';
  if (profile.isLoading) return <Skeleton className="h-64 w-full" />;
  if (profile.error || !profile.data) {
    const message = isNotDeployed(profile.error)
      ? 'Society pictures are not available yet.'
      : `Could not load the society profile: ${friendlyError(profile.error)}`;
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
      </Card>
    );
  }
  return (
    <ProfileImages profile={profile.data} canEditPictures={PROFILE_CONTENT_EDITORS.has(role)} canEditLogo={PROFILE_ADMIN_EDITORS.has(role)} />
  );
}
