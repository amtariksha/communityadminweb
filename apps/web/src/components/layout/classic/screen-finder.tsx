'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { MenuNode } from '../menu/classic-menu';
import { entryHref } from '../menu/menu-access';

interface ScreenEntry {
  id: string;
  path: string;
  href: string;
}

const MAX_RESULTS = 8;

/** Every screen in the visible menu with its "Module › Child › Tab" path. */
export function screenEntries(nodes: readonly MenuNode[], trail: string[] = []): ScreenEntry[] {
  return nodes.flatMap((node) => {
    const labels = [...trail, node.label];
    const nested = [...(node.children ?? []), ...(node.tabs ?? [])];
    if (nested.length > 0) return screenEntries(nested, labels);
    const href = entryHref(node);
    return href ? [{ id: node.id, path: labels.join(' › '), href }] : [];
  });
}

export function matchScreens(entries: readonly ScreenEntry[], query: string): ScreenEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return entries
    .filter((entry) => words.every((word) => entry.path.toLowerCase().includes(word)))
    .slice(0, MAX_RESULTS);
}

/** Top-bar search that jumps to a screen by its menu name. */
export function ScreenFinder({ menu }: { menu: readonly MenuNode[] }): ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => screenEntries(menu), [menu]);
  const results = matchScreens(entries, query);

  function go(entry: ScreenEntry): void {
    setQuery('');
    setOpen(false);
    router.push(entry.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter' && results[0]) go(results[0]);
    if (event.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative hidden w-64 md:block">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-classic-topbar-foreground/70" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Find a screen"
        aria-label="Find a screen"
        className="h-8 w-full rounded-md border border-classic-topbar-foreground/30 bg-classic-topbar-foreground/10 pl-8 pr-2 text-sm text-classic-topbar-foreground placeholder:text-classic-topbar-foreground/70 focus:bg-classic-topbar-foreground/20 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-9 z-50 overflow-hidden rounded-md border bg-card text-card-foreground shadow-lg"
        >
          {results.map((entry) => (
            <li key={entry.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(entry)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {entry.path}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
