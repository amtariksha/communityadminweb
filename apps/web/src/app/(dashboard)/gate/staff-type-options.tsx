'use client';

import { type ReactNode } from 'react';
import { staffTypeOfCategory, useStaffCategories } from '@/hooks/use-staff-categories';

// The fixed lists the gate offered before the society kept its own (STAFF-41).
const FALLBACK_STAFF = ['maid', 'cook', 'driver', 'nanny', 'gardener', 'plumber', 'electrician', 'other'];
const FALLBACK_REGULARS = ['maid', 'cook', 'driver', 'nanny', 'tutor', 'gardener', 'plumber', 'electrician', 'therapist', 'other'];

const label = (slug: string): string => slug.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());

/**
 * The staff types the gate pages offer: the society's categories (STAFF-41),
 * Domestic ones only for household help, else the fixed list an older API
 * implies. Each option's value is the type text the gate logs keep.
 */
export function StaffTypeOptions({ only }: { only?: 'domestic' }): ReactNode {
  const categories = useStaffCategories(only ? { kind: only } : {}).data;
  if (!categories) {
    return (only ? FALLBACK_REGULARS : FALLBACK_STAFF).map((slug) => (
      <option key={slug} value={slug}>
        {label(slug)}
      </option>
    ));
  }
  return categories.map((category) => (
    <option key={category.id} value={staffTypeOfCategory(category)}>
      {category.name}
    </option>
  ));
}
