'use client';

import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocietyProfile } from '@/hooks/use-society-profile';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { PROFILE_CONTENT_EDITORS } from '../profile-pictures';
import { WelcomeEditor } from './welcome-editor';

/** Society Profile › Home (PROF-S1, PROF-21). */
export default function Page(): ReactNode {
  const profile = useSocietyProfile();
  if (profile.isLoading) return <Skeleton className="h-64 w-full" />;
  if (profile.error || !profile.data) {
    const message = isNotDeployed(profile.error)
      ? 'The welcome message is not available yet.'
      : `Could not load the society profile: ${friendlyError(profile.error)}`;
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
      </Card>
    );
  }
  return <WelcomeEditor savedHtml={profile.data.welcome_message_html} canEdit={PROFILE_CONTENT_EDITORS.has(currentRole() ?? '')} />;
}
