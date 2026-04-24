'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUser, isAuthenticated, setCurrentTenant, logout } from '@/lib/auth';
import { getAdminSocieties } from '@/lib/admin-roles';
import type { User } from '@/lib/auth';

function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SelectTenantContent(): ReactNode {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setUser(getUser());
  }, [router]);

  if (!mounted || !user) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Filter to admin-eligible societies only — pure-resident roles
  // belong on the Flutter app.
  const adminSocieties = getAdminSocieties(user);

  if (adminSocieties.length === 0) {
    const reason = user.societies.length === 0 ? 'none' : 'resident';
    router.replace(`/no-access?reason=${reason}`);
    return null;
  }

  function handleSelect(tenantId: string): void {
    setCurrentTenant(tenantId);
    // QA #51 — full-page reload guarantees every React Query cache, every
    // RSC segment cache, and every prefetched route is rebuilt against
    // the new tenant. router.push keeps the in-memory cache which can
    // flash the previous society's data before the new queries resolve.
    window.location.href = '/';
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose Your Community</CardTitle>
        <CardDescription>
          You belong to multiple communities. Select one to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {adminSocieties.map((society) => (
          <button
            key={society.id}
            type="button"
            onClick={() => handleSelect(society.id)}
            className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:border-primary/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{society.name}</p>
              <Badge variant="secondary" className="mt-1">
                {formatRole(society.role)}
              </Badge>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}

        <div className="pt-2">
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
