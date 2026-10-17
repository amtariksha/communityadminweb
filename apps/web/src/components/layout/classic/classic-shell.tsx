'use client';

import { useState, type ReactNode } from 'react';
import { Footer } from '../footer';
import { ClassicSidebar } from './classic-sidebar';
import { ClassicTopBar } from './classic-top-bar';
import { ModuleFrame } from './module-frame';
import { currentMenuRole, useClassicMenu } from './use-classic-menu';
import { useMenuBadges } from './use-menu-badges';

interface ClassicShellProps {
  // Shown above the top bar, e.g. the super admin "viewing" banner.
  banner?: ReactNode;
  children: ReactNode;
}

/**
 * The classic admin shell (requirements Part 3.2): a full-width top bar,
 * the module menu on the left and each page inside its module frame.
 */
export function ClassicShell({ banner, children }: ClassicShellProps): ReactNode {
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useClassicMenu();
  const badges = useMenuBadges(menu, currentMenuRole());

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {banner}
      <ClassicTopBar menu={menu} onMenuClick={() => setMenuOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <ClassicSidebar menu={menu} open={menuOpen} onClose={() => setMenuOpen(false)} badges={badges} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-2 sm:p-4">
            <ModuleFrame menu={menu}>{children}</ModuleFrame>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
