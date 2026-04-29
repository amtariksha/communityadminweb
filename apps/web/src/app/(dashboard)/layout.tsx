'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import {
  getUser,
  getCurrentTenant,
  getToken,
  purgeLegacyTokenStorage,
  setCurrentTenant,
  clearCurrentTenant,
} from '@/lib/auth';
import { refreshAccessToken } from '@/lib/api';
import { getAdminSocieties } from '@/lib/admin-roles';
import type { User } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

/**
 * Returns the existing tenant id ONLY if the user still has an
 * admin-eligible role on it. Otherwise returns null so the bootstrap
 * picks fresh from the filtered admin-society list.
 */
function stillAdminTenant(
  tenantId: string | null,
  adminSocieties: User['societies'],
): string | null {
  if (!tenantId) return null;
  return adminSocieties.some((s) => s.id === tenantId) ? tenantId : null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getSuperAdminTenantName(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem('communityos_sa_tenant_name');
}

function handleBackToSuperAdmin(): void {
  if (!isBrowser()) return;
  localStorage.removeItem('communityos_tenant');
  localStorage.removeItem('communityos_sa_tenant_name');
  window.location.href = '/super-admin';
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactNode {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // QA #57 — access token lives in memory, so a tab reload starts
    // with `null`. Try the httpOnly refresh cookie first before
    // bouncing the user to /login — that's the only non-UX-regressing
    // way to keep reloads seamless after the localStorage removal.
    purgeLegacyTokenStorage();

    async function bootstrap(): Promise<void> {
      const existingToken = getToken();
      if (!existingToken) {
        const outcome = await refreshAccessToken();
        if (cancelled) return;
        if (outcome.kind === 'auth_failed') {
          router.replace('/login');
          return;
        }
        if (outcome.kind === 'transient') {
          // QA #28 — the 5-min access TTL means a network blip during
          // bootstrap used to silently kick the user to /login. Show
          // a retry banner instead; the cookie is probably still
          // valid, we just couldn't reach /auth/refresh right now.
          setBootstrapError(
            'Could not reach the server. Check your connection and try again.',
          );
          return;
        }
      }

      const user = getUser();
      const tenant = getCurrentTenant();

      // Multi-role hardening (2026-04-29): admin-web must only consider
      // admin-eligible roles when picking the active tenant. A user
      // who is `tenant_resident` of Society A AND `community_admin` of
      // Society B previously got auto-routed into Society A on
      // bootstrap (because `societies[0]` was Society A). All
      // subsequent screens then read `currentRole = tenant_resident`
      // and behaved like a resident on the admin panel. Filter by
      // admin-eligibility everywhere bootstrap touches localStorage.
      if (user && !user.isSuperAdmin) {
        const adminSocieties = getAdminSocieties(user);

        // Re-validate any pre-existing tenant in localStorage. If the
        // session was set on a society where the user has only
        // resident roles (e.g. role got revoked, or a stale entry
        // from before the role-shape fix), drop it and re-route.
        if (tenant) {
          const stillAdmin = adminSocieties.some((s) => s.id === tenant);
          if (!stillAdmin) {
            clearCurrentTenant();
          }
        }

        const effectiveTenant = stillAdminTenant(tenant, adminSocieties);
        if (!effectiveTenant) {
          if (adminSocieties.length === 0) {
            router.replace('/no-access');
            return;
          }
          if (adminSocieties.length === 1) {
            setCurrentTenant(adminSocieties[0].id);
          } else {
            router.replace('/select-tenant');
            return;
          }
        }
      }

      if (!cancelled) setBootstrapped(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (bootstrapError) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold">Connection issue</h2>
          <p className="text-sm text-muted-foreground">{bootstrapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!bootstrapped) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const user = getUser();
  const isSuperAdmin = user?.isSuperAdmin === true;
  const currentTenantId = getCurrentTenant();
  const tenantName = getSuperAdminTenantName();
  const showSuperAdminBanner = isSuperAdmin && currentTenantId && tenantName;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {showSuperAdminBanner && (
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-primary-foreground">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Super Admin</span>
              <span className="opacity-80">— viewing {tenantName}</span>
            </div>
            <button
              onClick={handleBackToSuperAdmin}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium hover:bg-primary-foreground/20 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Super Admin
            </button>
          </div>
        )}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
