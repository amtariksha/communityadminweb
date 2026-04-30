'use client';

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue>({
  open: false,
  setOpen: () => {},
});

function useDialog(): DialogContextValue {
  return useContext(DialogContext);
}

interface DialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps): ReactNode {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setInternalOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );

  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

function DialogTrigger({ children }: DialogTriggerProps): ReactNode {
  const { setOpen } = useDialog();
  return (
    <span onClick={() => setOpen(true)} className="cursor-pointer">
      {children}
    </span>
  );
}

const DialogContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function DialogContent(
  { className, children, ...props },
  ref,
) {
  const { open, setOpen } = useDialog();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function handleClose() {
      setOpen(false);
    }

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [setOpen]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      // QA #113 — mobile fit: dialog spans nearly the full viewport
      // on phones (≤640px) so long forms don't clip; reverts to the
      // narrow centred panel on tablets/desktops. max-h on mobile
      // is taller (95vh) because phones have less vertical chrome.
      className="fixed inset-0 z-50 m-auto max-h-[95vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-visible rounded-lg border bg-background p-0 shadow-lg backdrop:bg-black/50 open:flex open:flex-col sm:max-h-[85vh] sm:w-auto sm:max-w-lg"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false);
        }
      }}
    >
      {/* Inner padding tightens on mobile (p-4) and relaxes on
          tablet+ (p-6) so the form fields aren't visually crammed
          on a phone screen. The container's max-w cap above
          governs panel width; this just controls inset. */}
      <div ref={ref} className={cn('w-full overflow-visible p-4 sm:max-w-lg sm:p-6', className)} {...props}>
        {children}
      </div>
    </dialog>
  );
});
DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />;
}

function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): ReactNode {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;
}

function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>): ReactNode {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

interface DialogCloseProps {
  children: ReactNode;
  // Accepted for API parity with Radix-style components; this shim always
  // wraps children in a span so the flag is effectively ignored.
  asChild?: boolean;
}

function DialogClose({ children }: DialogCloseProps): ReactNode {
  const { setOpen } = useDialog();
  return (
    <span onClick={() => setOpen(false)} className="cursor-pointer">
      {children}
    </span>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
};
