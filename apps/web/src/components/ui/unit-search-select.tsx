'use client';
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { Input } from './input';

interface Unit {
  id: string;
  unit_number: string;
  block?: string | null;
}

interface UnitSearchSelectProps {
  value: string;
  onChange: (unitId: string) => void;
  units: Unit[];
  placeholder?: string;
}

/**
 * Same top-layer/transparency fix as the Select component:
 * - Use bg-card (defined in theme) instead of bg-popover (undefined, renders
 *   transparent)
 * - Portal the dropdown into the nearest <dialog> ancestor (so showModal()'s
 *   top layer doesn't clip it)
 */
function findDialogAncestor(el: Element | null): HTMLElement | null {
  let cur: Element | null = el;
  while (cur && cur !== document.body) {
    if (cur.tagName === 'DIALOG') return cur as HTMLElement;
    cur = cur.parentElement;
  }
  return null;
}

export function UnitSearchSelect({
  value,
  onChange,
  units,
  placeholder = 'Search unit...',
}: UnitSearchSelectProps): ReactNode {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = units.filter(
    (u) =>
      u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      (u.block && u.block.toLowerCase().includes(search.toLowerCase())),
  );

  const selected = units.find((u) => u.id === value);

  const positionDropdown = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStyle({
      position: 'fixed',
      left: rect.left,
      top: rect.bottom + 2,
      width: rect.width,
      zIndex: 10000,
    });
  }, []);

  const openDropdown = useCallback(() => {
    setPortalTarget(
      findDialogAncestor(wrapperRef.current) ?? document.body,
    );
    positionDropdown();
    setIsOpen(true);
    setSearch('');
  }, [positionDropdown]);

  // Close on outside click — check both wrapper and dropdown so clicks on
  // dropdown chrome (scrollbar, padding) don't dismiss it.
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', positionDropdown, true);
    window.addEventListener('resize', positionDropdown);
    return () => {
      window.removeEventListener('scroll', positionDropdown, true);
      window.removeEventListener('resize', positionDropdown);
    };
  }, [isOpen, positionDropdown]);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={
          isOpen
            ? search
            : selected
              ? `${selected.unit_number}${selected.block ? ` (${selected.block})` : ''}`
              : ''
        }
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) openDropdown();
        }}
        onFocus={openDropdown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={style}
            className="max-h-60 overflow-auto rounded-md border bg-card text-card-foreground shadow-lg"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No units found
              </div>
            ) : (
              filtered.slice(0, 20).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    // mousedown prevents the outside-click close from firing
                    // before React processes this click
                    e.preventDefault();
                    onChange(u.id);
                    setSearch('');
                    setIsOpen(false);
                  }}
                >
                  {u.unit_number}
                  {u.block ? ` (Block ${u.block})` : ''}
                </button>
              ))
            )}
          </div>,
          portalTarget ?? document.body,
        )}
    </div>
  );
}
