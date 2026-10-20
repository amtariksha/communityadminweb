'use client';

import { useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssistantPanel } from './assistant-panel';

/**
 * The top-bar Assistant button (both layouts). The panel loads nothing
 * until it is opened.
 */
export function AssistantButton({ className }: { className?: string }): ReactNode {
  const [open, setOpen] = useState(false);
  const label = 'Assistant';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={cn('flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent', className)}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">{label}</span>
      </button>
      {open && <AssistantPanel onClose={() => setOpen(false)} />}
    </>
  );
}
