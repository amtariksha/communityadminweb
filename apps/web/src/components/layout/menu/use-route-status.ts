'use client';

import { usePathname } from 'next/navigation';
import { statusFromPath, type StatusRoute } from './status-menu';

/** The status list the current page is, read from its route (SB-05). */
export function useRouteStatus<Status extends StatusRoute>(
  basePath: string,
  statuses: readonly Status[],
): Status | undefined {
  return statusFromPath(usePathname(), basePath, statuses) as Status | undefined;
}
