import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getCurrentTenant } from '@/lib/auth';
import { orNullOn404 } from './use-gate-lists';

/** A staff category of the society (STAFF-41): Official (society staff) or Domestic (household help). */
export interface StaffCategory {
  id: string;
  name: string;
  kind: 'official' | 'domestic';
  grants_guard_role: boolean;
  is_active: boolean;
  sort_order: number;
  /** The older fixed type it stands for, if any. */
  legacy_type: string | null;
  member_count?: number;
}

/** A row of PUT /staff/categories/bulk. */
export interface StaffCategoryGridRow {
  id?: string;
  name: string;
  kind: 'official' | 'domestic';
  grants_guard_role: boolean;
  is_active: boolean;
}

export const staffCategoryKeys = {
  all: ['staff-categories'] as const,
  list: (tenantId: string, includeInactive: boolean, kind?: string) => [...staffCategoryKeys.all, tenantId, includeInactive, kind ?? 'all'] as const,
};

/** The society's categories; null against an API without them (404) — callers fall back to the fixed types. */
export function useStaffCategories(options: { includeInactive?: boolean; kind?: 'official' | 'domestic' } = {}) {
  const tenantId = getCurrentTenant() ?? '';
  const includeInactive = options.includeInactive === true;
  return useQuery({
    queryKey: staffCategoryKeys.list(tenantId, includeInactive, options.kind),
    enabled: tenantId !== '',
    queryFn: () =>
      orNullOn404(async () => {
        const params: Record<string, string> = {};
        if (includeInactive) params.include_inactive = 'true';
        if (options.kind) params.kind = options.kind;
        return (await api.get<{ data: StaffCategory[] }>('/staff/categories', { params })).data;
      }),
  });
}

export function useSaveStaffCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveStaffCategories(rows: StaffCategoryGridRow[]) {
      return api.put<{ data: StaffCategory[] }>('/staff/categories/bulk', { rows });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: staffCategoryKeys.all });
    },
  });
}

/** The fixed type a category writes for older readers (its legacy type, else its name as a slug). */
export function staffTypeOfCategory(category: Pick<StaffCategory, 'legacy_type' | 'name'>): string {
  return category.legacy_type ?? (category.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'other');
}

/** The category a staff record is in: its category_id, else the one standing for its fixed type. */
export function categoryOfRecord(
  categories: readonly StaffCategory[],
  record: { category_id?: string | null; staff_type?: string | null },
): StaffCategory | undefined {
  return (
    categories.find((category) => category.id === record.category_id) ??
    categories.find((category) => category.legacy_type && category.legacy_type === record.staff_type)
  );
}
