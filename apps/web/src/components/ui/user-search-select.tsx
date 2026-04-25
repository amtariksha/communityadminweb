'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Input } from './input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useUserSearch,
  type UserSearchHit,
  type UserSearchScope,
} from '@/hooks/use-user-search';

/**
 * Reusable user autocomplete for every admin form that tags a user
 * (Add Member, Add Employee, Regular Visitor, etc.).
 *
 * Backed by:
 *  - GET /users/search (scope='tenant') — tenant-scoped, returns rich
 *    per-tenant unit + role context for the dropdown rows.
 *  - GET /super-admin/users?search= (scope='super-admin') — cross-
 *    tenant directory for the super-admin Add Member dialog.
 *
 * No-match flow is silent per the plan: no rows shown, the form keeps
 * the typed value, and on submit the server's `findOrCreateUser`
 * creates a fresh users row. Operators can confirm the typed phone is
 * unique by simply not selecting from the dropdown.
 *
 * Portal + positioning copied from `UnitSearchSelect` so the dropdown
 * escapes overflow-hidden dialog containers.
 */
export interface UserSearchSelectProps {
  /** The currently selected user, or null for empty. */
  value: UserSearchHit | null;
  /** Called when a row is picked or the input is cleared. */
  onChange: (user: UserSearchHit | null) => void;
  /** Tenant-scoped or cross-tenant. */
  scope: UserSearchScope;
  placeholder?: string;
  disabled?: boolean;
  /**
   * If true, the input retains the typed text instead of the picked
   * user's display string when no row is matched. Used by the Add
   * Member dialog so the operator can finish typing a brand-new
   * phone + name combination after the dropdown returns no hits.
   */
  retainTypedOnNoMatch?: boolean;
  /**
   * Called whenever the operator types in the input — both before and
   * during dropdown selection. Useful for parents that want to track
   * a free-text fallback (e.g. capture the typed phone so the form
   * submits even when no user was selected).
   */
  onQueryChange?: (q: string) => void;
}

function findDialogAncestor(el: Element | null): HTMLElement | null {
  let cur: Element | null = el;
  while (cur && cur !== document.body) {
    if (cur.tagName === 'DIALOG') return cur as HTMLElement;
    cur = cur.parentElement;
  }
  return null;
}

function highlight(text: string, q: string): ReactNode {
  if (!q || !text) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-foreground">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

export function UserSearchSelect({
  value,
  onChange,
  scope,
  placeholder = 'Search by phone or name…',
  disabled = false,
  retainTypedOnNoMatch = true,
  onQueryChange,
}: UserSearchSelectProps): ReactNode {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debounced = useDebouncedValue(search, 300);
  const query = useUserSearch(debounced, scope);
  const hits = query.data ?? [];

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
    if (disabled) return;
    setPortalTarget(findDialogAncestor(wrapperRef.current) ?? document.body);
    positionDropdown();
    setIsOpen(true);
  }, [disabled, positionDropdown]);

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

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', positionDropdown, true);
    window.addEventListener('resize', positionDropdown);
    return () => {
      window.removeEventListener('scroll', positionDropdown, true);
      window.removeEventListener('resize', positionDropdown);
    };
  }, [isOpen, positionDropdown]);

  const displayValue =
    isOpen
      ? search
      : value
        ? `${value.phone}${value.name ? ` — ${value.name}` : ''}`
        : retainTypedOnNoMatch && search
          ? search
          : '';

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={displayValue}
        onChange={(e) => {
          const q = e.target.value;
          setSearch(q);
          onQueryChange?.(q);
          // Clear an existing selection the moment the operator types
          // — keeps the picked-vs-typed distinction crisp.
          if (value) onChange(null);
          if (!isOpen) openDropdown();
        }}
        onFocus={openDropdown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={style}
            className="max-h-72 overflow-auto rounded-md border bg-card text-card-foreground shadow-lg"
          >
            {debounced.trim().length < 3 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Type at least 3 characters to search…
              </div>
            ) : query.isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Searching…
              </div>
            ) : hits.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matches. Continue typing — the form will create a new
                user on submit.
              </div>
            ) : (
              hits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  className="block w-full border-b border-border/50 px-3 py-2 text-left text-sm hover:bg-accent last:border-b-0"
                  onMouseDown={(e) => {
                    // mousedown prevents the outside-click close from
                    // firing before React processes this click.
                    e.preventDefault();
                    onChange(hit);
                    setSearch('');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs">
                      {highlight(hit.phone, debounced)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {hit.name ? highlight(hit.name, debounced) : '— no name —'}
                    </span>
                  </div>
                  {hit.units.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {hit.units.slice(0, 4).map((u) => (
                        <span
                          key={u.unit_id}
                          className={
                            u.is_current
                              ? 'rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground'
                              : 'rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground'
                          }
                        >
                          {u.unit_number} ({u.member_type})
                        </span>
                      ))}
                    </div>
                  )}
                  {hit.roles.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {hit.roles.slice(0, 4).map((r) => (
                        <span
                          key={r}
                          className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                        >
                          {r.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>,
          portalTarget ?? document.body,
        )}
    </div>
  );
}
