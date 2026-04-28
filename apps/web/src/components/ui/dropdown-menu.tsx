'use client';

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue>({
  open: false,
  setOpen: () => {},
});

interface DropdownMenuProps {
  children: ReactNode;
}

function DropdownMenu({ children }: DropdownMenuProps): ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  /**
   * When true, render the child element directly with the toggle
   * onClick attached, instead of wrapping it in our own `<button>`.
   * Required when the caller already passes a `<Button>` because the
   * old wrapper-button pattern produced nested `<button>` elements
   * (invalid HTML) and the inner button's `stopPropagation` blocked
   * the outer's toggle handler — that's QA #255 ("3-dots menu
   * unresponsive").
   */
  asChild?: boolean;
  className?: string;
}

interface ChildClickProps {
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  'aria-expanded'?: boolean;
}

function DropdownMenuTrigger({
  children,
  asChild,
  className,
}: DropdownMenuTriggerProps): ReactNode {
  const { open, setOpen } = useContext(DropdownContext);

  if (asChild) {
    // Find the only valid React element among children and merge our
    // click + aria-expanded onto it. We deliberately call the child's
    // existing onClick first — callers like tickets-content.tsx use
    // `(e) => e.stopPropagation()` to keep the row click handler from
    // firing. Then we toggle the menu, regardless of whether the child
    // stops propagation.
    const child = Children.toArray(children).find(isValidElement) as
      | React.ReactElement<ChildClickProps>
      | undefined;
    if (!child) {
      return null;
    }

    const childOnClick = child.props.onClick;
    const merged: ChildClickProps = {
      onClick: (event: ReactMouseEvent<HTMLElement>) => {
        if (childOnClick) childOnClick(event);
        setOpen(!open);
      },
      'aria-expanded': open,
    };
    return cloneElement(child, merged);
  }

  return (
    <button
      type="button"
      className={cn('cursor-pointer', className)}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

function DropdownMenuContent({
  className,
  align = 'end',
  children,
  ...props
}: DropdownMenuContentProps): ReactNode {
  const { open, setOpen } = useContext(DropdownContext);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    },
    [setOpen],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  if (!open) return null;

  let alignClass = 'right-0';
  if (align === 'start') {
    alignClass = 'left-0';
  } else if (align === 'center') {
    alignClass = 'left-1/2 -translate-x-1/2';
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-card p-1 text-card-foreground shadow-md',
        alignClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

function DropdownMenuItem({ className, disabled, onClick, ...props }: DropdownMenuItemProps): ReactNode {
  const { setOpen } = useContext(DropdownContext);

  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

function DropdownMenuLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('px-2 py-1.5 text-sm font-semibold', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
