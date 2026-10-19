'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffEmployee } from '@/hooks';
import { STAFF_ACTIVE, STAFF_BASE, STAFF_RETIRED } from '@/lib/staff-statuses';
import { EmployeeForm } from './employee-form';

const listOf = (active: boolean): string => `${STAFF_BASE}/${(active ? STAFF_ACTIVE : STAFF_RETIRED).slug}`;

/** Staff Manager › Add Staff as a page (STAFF-S3, SB-07). */
export function AddStaffPage(): ReactNode {
  const router = useRouter();
  const back = () => router.push(listOf(true));
  return <EmployeeForm mode="page" onClose={back} onSaved={back} />;
}

/** Staff Manager › Edit Staff as a page; Close goes back to the employee's list. */
export function EditStaffPage({ id }: { id: string }): ReactNode {
  const router = useRouter();
  const query = useStaffEmployee(id);
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">This staff member could not be found.</p>;
  }
  const back = () => router.push(listOf(query.data?.is_active ?? true));
  return <EmployeeForm key={query.data.id} mode="page" employee={query.data} onClose={back} onSaved={back} />;
}
