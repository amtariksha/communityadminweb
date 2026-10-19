'use client';

import { type ReactNode } from 'react';
import { Blocks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEnabledFeatures } from '@/hooks/use-tenant-features';
import { MODULE_FEATURES } from '@/lib/feature-catalogue';

/**
 * Settings › Modules: which modules the society has. Read-only (SB-15): the
 * old Feature Toggles card saved keys the API dropped or nothing read, so
 * its switches never changed anything. The menus follow
 * `tenants.enabled_features`, which the platform administrator sets.
 */
export function ModulesCard(): ReactNode {
  const featuresQuery = useEnabledFeatures();
  const enabled = new Set(featuresQuery.data ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Blocks className="h-5 w-5" />
          Modules
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The modules this society uses. They are switched on and off by the platform
          administrator; ask them to change one.
        </p>
      </CardHeader>
      <CardContent>
        {featuresQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : featuresQuery.isError ? (
          <p className="text-sm text-muted-foreground">The module list could not be loaded.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {MODULE_FEATURES.map((module) => (
              <li key={module.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm">{module.label}</span>
                <Badge variant={enabled.has(module.key) ? 'success' : 'secondary'}>
                  {enabled.has(module.key) ? 'On' : 'Off'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
