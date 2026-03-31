'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps): ReactNode {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5A623]">
              <span className="text-sm font-bold text-white">e</span>
            </div>
            <span className="text-lg font-bold">Eassy Society — Super Admin</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 lg:p-6">{children}</main>
    </div>
  );
}
