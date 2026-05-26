'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  // ReactNode rather than string so callers can drop inline controls
  // into the subtitle slot (e.g. an FY selector on the Accounts page).
  // Plain strings still work — they render exactly as before.
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  breadcrumbs,
}: PageHeaderProps): ReactNode {
  return (
    <div className={cn('space-y-1', className)}>
      {/* The page-level breadcrumb was duplicating the header's
          global breadcrumb (which became clickable in the same
          change-set). Page-level breadcrumb removed so we don't
          render the same crumbs twice. The `breadcrumbs` prop is
          kept on the API for back-compat with the dozen-plus
          callers that still pass it — accepted and ignored here. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description &&
            (typeof description === 'string' ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : (
              <div className="text-sm text-muted-foreground">{description}</div>
            ))}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
