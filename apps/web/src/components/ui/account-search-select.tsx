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
import { useLedgerAccounts } from '@/hooks/use-ledger';

/**
 * Searchable, type-scoped picker for ledger accounts. Built on the
 * same portal + fixed-position pattern as UnitSearchSelect so it
 * escapes overflow-hidden dialog containers.
 *
 * The big difference from UnitSearchSelect is that this fetches its
 * options from the API, not from a `units` prop, AND filters by
 * `account_type` so context-specific dropdowns only show relevant
 * accounts. For example:
 *   - Bill convert "Expense Account":  accountType={['expense']}
 *   - Bill convert "Payable Account":  accountType={['liability']}
 *   - Receipt entry "Bank/Cash":       accountType={['asset']}
 *
 * Currently shows up to 50 candidates server-side filtered by the
 * ?search= query. The dropdown lists groups them by their parent
 * account_groups.name so the operator can spot which group each
 * ledger belongs to (matters when "HDFC Bank" and "HDFC FD" are both
 * present, and the picker is a Payment dialog).
 */

interface LedgerAccountHit {
  id: string;
  name: string;
  code: string | null;
  group_name?: string;
}

interface AccountSearchSelectProps {
  value: string;
  onChange: (accountId: string) => void;
  /**
   * Constrains the dropdown to ledgers whose parent group has one of
   * these account_types. Empty array = no constraint (all accounts).
   * Recommended: always pass at least one type to keep the list
   * relevant — the COA can have hundreds of ledger rows.
   */
  accountType?: Array<'asset' | 'liability' | 'income' | 'expense' | 'equity'>;
  placeholder?: string;
  disabled?: boolean;
}

function findDialogAncestor(el: Element | null): HTMLElement | null {
  let cur: Element | null = el;
  while (cur && cur !== document.body) {
    if (cur.tagName === 'DIALOG') return cur as HTMLElement;
    cur = cur.parentElement;
  }
  return null;
}

export function AccountSearchSelect({
  value,
  onChange,
  accountType,
  placeholder = 'Search account...',
  disabled,
}: AccountSearchSelectProps): ReactNode {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce the search input — typing 'maint' shouldn't fire 5
  // queries.
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(handle);
  }, [search]);

  const accountTypeKey = accountType?.join(',');
  const { data: listResp, isLoading } = useLedgerAccounts({
    search: debounced || undefined,
    account_type: accountTypeKey || undefined,
    limit: 50,
  });

  // Always show the candidates — the server already filtered by
  // account_type. Local filter is unnecessary (server-side `search`
  // does the work) but we'll still slice to 50 for safety.
  const hits: LedgerAccountHit[] = (listResp?.data ?? []).slice(0, 50);

  // Resolve the currently selected value's display string. We need
  // the row's name + code, but the list endpoint may not have it
  // when the user just opened the dialog and `value` was set from
  // outside. Fall back to the id when not found.
  const selected = hits.find((h) => h.id === value);

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
    setPortalTarget(
      findDialogAncestor(wrapperRef.current) ?? document.body,
    );
    positionDropdown();
    setIsOpen(true);
    setSearch('');
  }, [positionDropdown, disabled]);

  // Close on outside click — check both wrapper and dropdown so clicks
  // on dropdown chrome don't dismiss it.
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

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={
          isOpen
            ? search
            : selected
              ? `${selected.name}${selected.group_name ? ` — ${selected.group_name}` : ''}`
              : ''
        }
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) openDropdown();
        }}
        onFocus={openDropdown}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
      />
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={style}
            className="max-h-72 overflow-auto rounded-md border bg-card text-card-foreground shadow-lg"
          >
            {isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!isLoading && hits.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No matching accounts. Try a different search term.
              </div>
            )}
            {!isLoading &&
              hits.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    // mousedown so the outside-click handler doesn't fire
                    // before React processes the click.
                    e.preventDefault();
                    onChange(acc.id);
                    setSearch('');
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium">{acc.name}</div>
                  {acc.group_name && (
                    <div className="text-xs text-muted-foreground">
                      {acc.group_name}
                      {acc.code ? ` · ${acc.code}` : ''}
                    </div>
                  )}
                </button>
              ))}
          </div>,
          portalTarget ?? document.body,
        )}
    </div>
  );
}
