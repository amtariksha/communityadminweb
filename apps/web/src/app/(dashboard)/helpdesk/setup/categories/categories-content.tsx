'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import {
  useHelpdeskAssignees,
  useHelpdeskCategories,
  useSaveHelpdeskCategories,
  useSaveHelpdeskSubcategories,
} from '@/hooks';
import type { HelpdeskCategory, HelpdeskCategoryRow, HelpdeskSubcategoryRow } from '@/hooks';
import { CategoriesGrid } from './categories-grid';
import { SubcategoriesDialog } from './subcategories-dialog';
import { SetupLinks } from '../setup-links';

// Roles the API lets save the grid; everyone else sees it read-only.
const SAVE_ROLES = new Set(['super_admin', 'community_admin']);

export default function CategoriesContent(): ReactNode {
  const { addToast } = useToast();
  const categoriesQuery = useHelpdeskCategories();
  const assigneesQuery = useHelpdeskAssignees();
  const saveMutation = useSaveHelpdeskCategories();
  const saveSubcategories = useSaveHelpdeskSubcategories();
  const [subcategoriesOf, setSubcategoriesOf] = useState<HelpdeskCategory | null>(null);
  // An API without HELP-17 sends no sub-categories: no column then.
  const hasSubcategories = (categoriesQuery.data ?? []).some((category) => Array.isArray(category.subcategories));

  const role = useMemo(() => currentRole(), []);
  const canSave = role !== null && SAVE_ROLES.has(role);

  async function handleSave(rows: HelpdeskCategoryRow[]): Promise<void> {
    try {
      await saveMutation.mutateAsync(rows);
      addToast({ title: 'Categories saved', variant: 'success' });
    } catch (error) {
      addToast({
        title: 'Could not save the categories',
        description: friendlyError(error),
        variant: 'destructive',
      });
    }
  }

  async function handleSaveSubcategories(categoryId: string, rows: HelpdeskSubcategoryRow[]): Promise<void> {
    try {
      await saveSubcategories.mutateAsync({ categoryId, rows });
      addToast({ title: 'Sub-categories saved', variant: 'success' });
      setSubcategoriesOf(null);
    } catch (error) {
      addToast({ title: 'Could not save the sub-categories', description: friendlyError(error), variant: 'destructive' });
      throw error;
    }
  }

  const isLoading = categoriesQuery.isLoading || assigneesQuery.isLoading;
  const loadFailed = categoriesQuery.isError || assigneesQuery.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Helpdesk Categories"
        description="Each request goes to the owner of its category. Category owners are people with an admin role in this society."
      />
      <SetupLinks current="categories" />
      <p className="text-sm text-muted-foreground">
        Change admin roles in <Link href="/settings" className="text-primary hover:underline">Settings</Link>.
        {' '}Owners of the second and third level, and how long each level has, are set in the{' '}
        <Link href="/helpdesk/escalation" className="text-primary hover:underline">escalation matrix</Link>.
      </p>
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : loadFailed ? (
            <p role="alert" className="text-sm text-destructive">
              The categories could not be loaded. Reload the page to try again.
            </p>
          ) : (
            <CategoriesGrid
              // A fresh copy of the saved list resets the grid after Save Changes.
              key={categoriesQuery.dataUpdatedAt}
              categories={categoriesQuery.data ?? []}
              owners={assigneesQuery.data ?? []}
              isSaving={saveMutation.isPending}
              readOnly={!canSave}
              onSave={handleSave}
              onEditSubcategories={hasSubcategories ? setSubcategoriesOf : undefined}
            />
          )}
        </CardContent>
      </Card>
      <SubcategoriesDialog
        category={subcategoriesOf}
        readOnly={!canSave}
        isSaving={saveSubcategories.isPending}
        onClose={() => setSubcategoriesOf(null)}
        onSave={handleSaveSubcategories}
      />
    </div>
  );
}
