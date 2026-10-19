'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** Whether the API answered 404: the report registry is not deployed there yet. */
export function notDeployed(error: unknown): boolean {
  return (error as { status?: unknown } | null)?.status === 404;
}

/** Loading, "not available yet" and "Could not load reports" for catalogue pages. */
export function CatalogueState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}): ReactNode {
  if (loading) {
    return (
      <div className="space-y-2" aria-label="Loading reports">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    );
  }
  if (notDeployed(error)) {
    return <p className="text-sm text-muted-foreground">Reports are not available yet.</p>;
  }
  return (
    <div role="alert" className="flex items-center gap-3 text-sm">
      <span>Could not load reports.</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
