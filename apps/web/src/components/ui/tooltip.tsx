'use client';

import { useState, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  delayMs?: number;
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

function Tooltip({
  content,
  children,
  side = 'top',
  className,
  delayMs = 200,
}: TooltipProps): ReactNode {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleMouseEnter(): void {
    timeoutRef.current = setTimeout(() => setVisible(true), delayMs);
  }

  function handleMouseLeave(): void {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 max-w-xs whitespace-normal rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md border',
            positionClasses[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export { Tooltip };
export type { TooltipProps };
