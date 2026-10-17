'use client';

import { type ReactNode } from 'react';
import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, getInitials } from '@/components/ui/avatar';
import { SocietyLogo } from '@/components/society-logo';
import { getCurrentTenant, getUser, logout } from '@/lib/auth';
import { pickDisplayRole } from '@/lib/admin-roles';
import type { MenuNode } from '../menu/classic-menu';
import { formatRoleLabel, resolveDisplayName } from '../sidebar';
import { SocietySwitcher } from '../society-switcher';
import { ScreenFinder } from './screen-finder';

interface ClassicTopBarProps {
  menu: readonly MenuNode[];
  onMenuClick: () => void;
}

const onBar = 'rounded-md p-1.5 hover:bg-classic-topbar-foreground/10';

function UserMenu(): ReactNode {
  const user = getUser();
  const name = resolveDisplayName(user);
  const role = user ? pickDisplayRole(user, getCurrentTenant()) : undefined;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={`flex items-center gap-2 ${onBar}`}>
        <Avatar size="sm">
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium lg:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {name}
          <span className="block text-xs font-normal text-muted-foreground">
            {formatRoleLabel(role)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}>
          <span className="flex items-center gap-2 text-destructive">
            <LogOut className="h-4 w-4" />
            Sign Out
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Classic top bar (requirements Part 3.2): the society's own logo and
 * name, a screen finder, society switch and the user menu, on the
 * classic bar colour.
 */
export function ClassicTopBar({ menu, onMenuClick }: ClassicTopBarProps): ReactNode {
  const { theme, setTheme } = useTheme();
  return (
    <header className="flex h-[66px] shrink-0 items-center gap-3 bg-classic-topbar pr-4 text-classic-topbar-foreground">
      <button type="button" className={`ml-2 md:hidden ${onBar}`} onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </button>
      <div className="w-[223px] shrink-0 max-md:w-auto">
        <SocietyLogo />
      </div>
      <ScreenFinder menu={menu} />
      <div className="ml-auto flex items-center gap-2">
        <SocietySwitcher triggerClassName="border-classic-topbar-foreground/30 hover:bg-classic-topbar-foreground/10" />
        <button
          type="button"
          className={onBar}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
