'use client';

import { type ReactNode } from 'react';

/** Downloadable Files (PROF-S7): where the Public tick is offered (`?public=offer`, or Edit returning there). */
export const PUBLIC_FILES_PAGE = '/society-profile/files';

/** Whether an upload or edit page opened from Downloadable Files offers the tick. */
export function offersPublic(params: { get: (name: string) => string | null }): boolean {
  return params.get('public') === 'offer' || params.get('return') === PUBLIC_FILES_PAGE;
}

/**
 * PROF-42: the file is listed on the society's logged-out files page.
 * Off by default (decision PROF-D5); only for a file every resident reads.
 */
export function PublicTick(props: { checked: boolean; allowed: boolean; onChange: (checked: boolean) => void }): ReactNode {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={props.checked && props.allowed}
          disabled={!props.allowed}
          onChange={(e) => props.onChange(e.target.checked)}
        />
        Public
      </label>
      <p className="text-xs text-muted-foreground">
        {props.allowed
          ? 'Anyone with the society’s public page link can download it, without signing in.'
          : 'Only a file shown to all residents can be public.'}
      </p>
    </div>
  );
}
