'use client';

import { useParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeeting } from '@/hooks';
import type { MeetingDetail } from '@/hooks/use-meetings';
import { friendlyError } from '@/lib/api-error';

export type LoadedMeeting = MeetingDetail;

/** The meeting named in the route, handed to `children` once loaded. */
export function WithMeeting({ children }: { children: (meeting: LoadedMeeting) => ReactNode }): ReactNode {
  const { id } = useParams<{ id: string }>();
  const query = useMeeting(id);
  if (query.data) return children(query.data);
  if (query.error) return <p className="text-sm text-destructive">Could not load the meeting: {friendlyError(query.error)}</p>;
  return <Skeleton className="h-48 w-full" />;
}

/** A closed meeting opens read-only. */
export function ClosedNotice(): ReactNode {
  return <p className="text-sm text-muted-foreground">This meeting is closed and can no longer be changed.</p>;
}
