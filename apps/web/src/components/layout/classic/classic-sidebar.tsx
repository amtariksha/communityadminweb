'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import type { MenuNode } from '../menu/classic-menu';
import { entryHref, locate } from '../menu/menu-access';

interface ClassicSidebarProps {
  menu: readonly MenuNode[];
  open: boolean;
  onClose: () => void;
}

function openStateKey(): string {
  return `cos.classic.menu.open.${getUser()?.id ?? 'anonymous'}`;
}

function readOpenModules(): Set<string> {
  try {
    const raw = localStorage.getItem(openStateKey());
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeOpenModules(ids: ReadonlySet<string>): void {
  try {
    localStorage.setItem(openStateKey(), JSON.stringify([...ids]));
  } catch {
    // Remembering open modules is a convenience; ignore blocked storage.
  }
}

const itemClass = (active: boolean): string =>
  cn(
    'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
    active ? 'bg-classic-menu-active font-semibold' : 'hover:bg-classic-menu-hover',
  );

/**
 * Classic left menu (requirements SB-02): modules in the committee's
 * order, each opening to its children. Open modules are remembered per
 * user; the module holding the current page is always open.
 */
export function ClassicSidebar({ menu, open, onClose }: ClassicSidebarProps): ReactNode {
  const pathname = usePathname();
  const location = locate(pathname, menu);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setOpenIds(readOpenModules());
  }, []);

  function toggle(id: string): void {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeOpenModules(next);
      return next;
    });
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[223px] flex-col bg-classic-menu text-classic-menu-foreground transition-transform duration-200 md:static md:z-auto md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <nav aria-label="Modules" className="flex-1 overflow-y-auto py-2">
          <ul>
            {menu.map((module) => {
              const inModule = location?.module.id === module.id;
              if (!module.children) {
                return (
                  <li key={module.id}>
                    <Link href={entryHref(module) ?? '/'} onClick={onClose} className={itemClass(inModule)}>
                      {module.icon}
                      <span className="flex-1">{module.label}</span>
                    </Link>
                  </li>
                );
              }
              const expanded = inModule || openIds.has(module.id);
              return (
                <li key={module.id}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggle(module.id)}
                    className={itemClass(false)}
                  >
                    {module.icon}
                    <span className="flex-1">{module.label}</span>
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {expanded && (
                    <ul>
                      {module.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={entryHref(child) ?? '/'}
                            onClick={onClose}
                            aria-current={location?.child?.id === child.id ? 'page' : undefined}
                            className={cn(itemClass(location?.child?.id === child.id), 'pl-10')}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
