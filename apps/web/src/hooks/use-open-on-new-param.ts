'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * `?new=1` on a list page opens that page's create form on load (the dashboard
 * buttons "Create New Request", "Book Facilities", "Create Meeting" and "Create
 * Announcement" link there). The parameter is removed from the URL once
 * handled so Back and a reload do not open the form again.
 *
 * Where the form has a page of its own and the layout shows forms as pages
 * (SB-07), pass `formPage`: the link then goes to that page instead of
 * opening the dialog.
 */
export function useOpenOnNewParam(open: () => void, formPage?: string): void {
  const query = useSearchParams()?.toString() ?? '';
  const pathname = usePathname();
  const router = useRouter();
  // Refs, so a new callback or router object on re-render never re-runs the effect.
  const latestOpen = useRef(open);
  const latestRouter = useRef(router);
  latestOpen.current = open;
  latestRouter.current = router;

  useEffect(() => {
    const params = new URLSearchParams(query);
    if (params.get('new') !== '1') return;
    if (formPage) {
      latestRouter.current.replace(formPage);
      return;
    }
    latestOpen.current();
    params.delete('new');
    const rest = params.toString();
    latestRouter.current.replace(rest ? `${pathname}?${rest}` : pathname);
  }, [query, pathname, formPage]);
}
