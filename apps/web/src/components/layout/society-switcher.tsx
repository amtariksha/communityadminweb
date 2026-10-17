'use client';

import { type ReactNode } from 'react';
import { Building2, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getUser, getCurrentTenant, setCurrentTenant } from '@/lib/auth';

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
  // A full reload also re-runs the pre-paint layout script, so the new
  // society's layout (standard or classic) applies from the first paint.
  window.location.reload();
}

interface SocietySwitcherProps {
  // Classes for the trigger; the default suits the light standard header.
  triggerClassName?: string;
}

/** Society picker shared by the standard header and the classic top bar. */
export function SocietySwitcher({ triggerClassName }: SocietySwitcherProps): ReactNode {
  const user = getUser();
  const societies = user?.societies ?? [];
  const currentTenantId = getCurrentTenant();
  const currentTenantName = getCurrentTenantName(societies, currentTenantId);

  if (societies.length === 0) return null;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent',
            triggerClassName,
          )}
        >
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">{currentTenantName}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {societies.map((society) => (
            <DropdownMenuItem key={society.id} onClick={() => handleSwitchTenant(society.id)}>
              <span className="flex items-center gap-2">
                {society.id === currentTenantId && <Check className="h-4 w-4 text-primary" />}
                {society.id !== currentTenantId && <span className="h-4 w-4" />}
                {society.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
