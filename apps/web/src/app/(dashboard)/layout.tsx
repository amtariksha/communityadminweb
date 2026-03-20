'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { isAuthenticated, getUser, getCurrentTenant, setCurrentTenant } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const user = getUser();
    const tenant = getCurrentTenant();
    if (!tenant && user && !user.isSuperAdmin) {
      if (user.societies.length === 1) {
        setCurrentTenant(user.societies[0].id);
      } else if (user.societies.length > 1) {
        router.replace('/select-tenant');
      } else {
        router.replace('/no-access');
      }
    }
  }, [router]);

  if (!mounted) {
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
