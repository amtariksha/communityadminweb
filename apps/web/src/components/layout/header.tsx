'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { Menu, Moon, Sun, ChevronRight, Building2, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUser, getCurrentTenant, setCurrentTenant } from '@/lib/auth';

interface HeaderProps {
  onMenuClick: () => void;
}

function getBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  const labelMap: Record<string, string> = {
    accounts: 'Accounts',
    invoices: 'Invoices',
    receipts: 'Receipts',
    vendors: 'Vendors',
    purchases: 'Purchases',
    bank: 'Bank',
    reports: 'Reports',
    units: 'Units',
    members: 'Members',
    documents: 'Documents',
    settings: 'Settings',
  };

  let path = '';
  for (const segment of segments) {
    path += `/${segment}`;
    const label = labelMap[segment] ?? segment;
    breadcrumbs.push({ label, href: path });
  }

  return breadcrumbs;
}

function getCurrentTenantName(
  societies: Array<{ id: string; name: string; role: string }>,
  currentTenantId: string | null,
): string {
  if (!currentTenantId || societies.length === 0) {
    return 'Select Society';
  }

  const match = societies.find((s) => s.id === currentTenantId);
  if (match) {
    return match.name;
  }

  return societies[0]?.name ?? 'Select Society';
}

function handleSwitchTenant(tenantId: string): void {
  setCurrentTenant(tenantId);
  window.location.reload();
}

export function Header({ onMenuClick }: HeaderProps): ReactNode {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const user = getUser();
  const breadcrumbs = getBreadcrumbs(pathname);
  const societies = user?.societies ?? [];
  const currentTenantId = getCurrentTenant();
  const currentTenantName = getCurrentTenantName(societies, currentTenantId);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
        <span className="font-medium text-foreground">Home</span>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">{crumb.label}</span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {societies.length > 0 && (
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{currentTenantName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {societies.map((society) => (
                  <DropdownMenuItem
                    key={society.id}
                    onClick={() => handleSwitchTenant(society.id)}
                  >
                    <span className="flex items-center gap-2">
                      {society.id === currentTenantId && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      {society.id !== currentTenantId && (
                        <span className="h-4 w-4" />
                      )}
                      {society.name}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  );
}
