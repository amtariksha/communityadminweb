'use client';

/**
 * Portal-based Select component.
 *
 * Drop-in replacement for the native <select>. Renders the option list via
 * React.createPortal so it is never clipped by parent overflow or transform
 * contexts (e.g. modal dialogs).
 *
 * API is intentionally compatible with <SelectHTMLAttributes<HTMLSelectElement>>:
 *   <Select value={value} onChange={(e) => setState(e.target.value)}>
 *     <option value="a">A</option>
 *   </Select>
 */

import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  // Native <select> has no placeholder attribute; the portal-based renderer
  // shows this when no option is selected. Kept optional to stay drop-in.
  placeholder?: string;
};

interface OptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}

function extractOptions(children: ReactNode): OptionItem[] {
  return Children.toArray(children).reduce<OptionItem[]>((acc, child) => {
    if (!isValidElement(child)) return acc;
    const type = child.type as string;
    if (type === 'option') {
      const p = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
      acc.push({
        value: String(p.value ?? ''),
        label: String(p.children ?? p.value ?? ''),
        disabled: p.disabled,
      });
    } else if (type === 'optgroup') {
      const gp = child.props as { children?: ReactNode };
      acc.push(...extractOptions(gp.children));
    }
    return acc;
  }, []);
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  // `placeholder` is pulled off here so it never reaches the native <select>
  // (which doesn't know the attribute) — SelectProps widens the type above.
  { className, children, value, onChange, disabled, placeholder, ...props },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = extractOptions(children);
  const selected = options.find((o) => String(o.value) === String(value ?? ''));
  const displayLabel = selected?.label ?? (placeholder as string | undefined) ?? '';
  const isEmpty = !selected;

  // Find the nearest <dialog> ancestor. When a native <dialog> is shown via
  // showModal(), it lives in the browser's "top layer" which sits above ALL
  // z-indexed content — including portals to document.body. Portaling the
  // dropdown into the dialog itself puts it inside the same top layer so
  // options appear in front of the modal.
  function findDialogAncestor(el: Element | null): HTMLElement | null {
    let cur: Element | null = el;
    while (cur && cur !== document.body) {
      if (cur.tagName === 'DIALOG') return cur as HTMLElement;
      cur = cur.parentElement;
    }
    return null;
  }

  const openDropdown = useCallback(() => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dropdownMaxH = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < Math.min(options.length * 36 + 8, dropdownMaxH) && rect.top > spaceBelow;

    setPortalTarget(
      findDialogAncestor(triggerRef.current) ?? document.body,
    );

    setStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 10000,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 2 }
        : { top: rect.bottom + 2 }),
    });
    setOpen(true);
  }, [disabled, options.length]);

  const selectOption = useCallback(
    (optValue: string) => {
      if (onChange) {
        const synthetic = {
          target: { value: optValue },
          currentTarget: { value: optValue },
          nativeEvent: new Event('change'),
          bubbles: true,
          cancelable: false,
          defaultPrevented: false,
          eventPhase: 0,
          isTrusted: false,
          preventDefault: () => {},
          isDefaultPrevented: () => false,
          stopPropagation: () => {},
          isPropagationStopped: () => false,
          persist: () => {},
          timeStamp: Date.now(),
          type: 'change',
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(synthetic);
      }
      setOpen(false);
    },
    [onChange],
  );

  // Close on click outside (check both trigger and portaled dropdown so that
  // clicks on dropdown chrome — scrollbar, padding — don't close prematurely).
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Update position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const onScroll = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownMaxH = 280;
      const showAbove = spaceBelow < Math.min(options.length * 36 + 8, dropdownMaxH) && rect.top > spaceBelow;
      setStyle((prev) => ({
        ...prev,
        left: rect.left,
        width: rect.width,
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 2, top: undefined }
          : { top: rect.bottom + 2, bottom: undefined }),
      }));
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, options.length]);

  return (
    <>
      {/*
       * Hidden native <select> for accessibility / form serialisation.
       * The ref is forwarded here for react-hook-form compatibility.
       */}
      <select
        ref={ref}
        className="sr-only"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        {...props}
      >
        {children}
      </select>

      {/* Visible trigger button */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={cn(
          'flex h-10 w-full cursor-pointer select-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          open && 'ring-2 ring-ring ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          if (open) setOpen(false);
          else openDropdown();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (open) setOpen(false);
            else openDropdown();
          }
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown' && !open) openDropdown();
        }}
      >
        <span
          className={cn(
            'truncate',
            isEmpty && 'text-muted-foreground',
          )}
        >
          {displayLabel || <span className="text-muted-foreground">{placeholder ?? 'Select…'}</span>}
        </span>
        <ChevronDown
          className={cn(
            'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </div>

      {/* Portal dropdown — renders into the nearest <dialog> ancestor (so it
          shares the modal's top-layer) or into document.body otherwise. This
          prevents the dropdown from being hidden behind native showModal()
          dialogs, which render in a top layer that sits above all z-index. */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={style}
            className="rounded-md border bg-card text-card-foreground shadow-md"
          >
            <div className="max-h-[280px] overflow-y-auto p-1">
              {options.map((opt) => (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={String(opt.value) === String(value ?? '')}
                  aria-disabled={opt.disabled}
                  className={cn(
                    'cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                    opt.disabled
                      ? 'cursor-not-allowed opacity-40'
                      : 'hover:bg-accent hover:text-accent-foreground',
                    String(opt.value) === String(value ?? '') &&
                      'bg-accent text-accent-foreground font-medium',
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!opt.disabled) selectOption(opt.value);
                  }}
                >
                  {opt.label}
                </div>
              ))}
              {options.length === 0 && (
                <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                  No options
                </div>
              )}
            </div>
          </div>,
          portalTarget ?? document.body,
        )}
    </>
  );
});

Select.displayName = 'Select';

export { Select };
