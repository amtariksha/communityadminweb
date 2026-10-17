'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { ShowLogsButton } from '@/components/show-logs';
import { cn } from '@/lib/utils';
import { MORE_GROUP_ID, type MenuNode } from '../menu/classic-menu';
import { entryHref, locate, type MenuLocation } from '../menu/menu-access';

interface ModuleFrameProps {
  menu: readonly MenuNode[];
  children: ReactNode;
}

function frameTitle({ module, child }: MenuLocation): string {
  return child ? `${module.label} › ${child.label}` : module.label;
}

// Close goes back to where the module opens: its first child. The More
// group is not a module, so it has nowhere to close to.
function closeHref(module: MenuNode): string | undefined {
  if (module.id === MORE_GROUP_ID) return undefined;
  return entryHref(module.children?.[0] ?? module);
}

function SubTabs({ tabs, activeId }: { tabs: readonly MenuNode[]; activeId?: string }): ReactNode {
  return (
    <nav aria-label="Sub-tabs" className="flex flex-wrap gap-1 border-b">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={entryHref(tab) ?? '#'}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Classic module frame (requirements SB-03): module title, sub-tabs that
 * are real routes, the module's Create button and Close. Pages render
 * inside it unchanged; the dashboard page has no frame.
 */
export function ModuleFrame({ menu, children }: ModuleFrameProps): ReactNode {
  const pathname = usePathname();
  const location = locate(pathname, menu);
  if (!location || location.module.id === 'dashboard') return <>{children}</>;

  const { module, child, tab, form } = location;
  const tabs = child?.tabs ?? module.tabs ?? [];
  // A form page carries its own Save and Close (SB-07).
  const create = form ? undefined : child?.create ?? module.create;
  const logs = (tab ?? child ?? module).logs;
  const close = form ? undefined : closeHref(module);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <h2 className="text-lg font-semibold">{frameTitle(location)}</h2>
          <div className="flex items-center gap-2">
            {logs && logs.length > 0 && <ShowLogsButton recordTypes={logs} />}
            {create && (
              <Link href={create.href} className={buttonVariants()} data-slot="button" data-size="default">
                {create.label}
              </Link>
            )}
            {close && close !== pathname && (
              <Link
                href={close}
                className={buttonVariants({ variant: 'outline' })}
                data-slot="button"
                data-size="default"
              >
                Close
              </Link>
            )}
          </div>
        </div>
        {tabs.length > 1 && <SubTabs tabs={tabs} activeId={tab?.id} />}
      </div>
      {children}
    </div>
  );
}
