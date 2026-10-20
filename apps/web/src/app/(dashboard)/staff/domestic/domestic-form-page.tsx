'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDomesticStaff } from '@/hooks/use-staff-register';
import { STAFF_BASE } from '@/lib/staff-statuses';
import { DomesticForm } from './domestic-form';

const listOf = (status: string): string => `${STAFF_BASE}/${status}`;

/** Staff Manager › Add Household Help (STAFF-42). */
export function AddDomesticPage(): ReactNode {
  const router = useRouter();
  const back = () => router.push(listOf('active'));
  return <DomesticForm onClose={back} onSaved={back} />;
}

/** Staff Manager › Edit Household Help; Close goes back to the helper's list. */
export function EditDomesticPage({ id }: { id: string }): ReactNode {
  const router = useRouter();
  const query = useDomesticStaff(id);
  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">This household helper could not be found.</p>;
  }
  const back = () => router.push(listOf(query.data?.status ?? 'active'));
  return <DomesticForm key={query.data.id} saved={query.data} onClose={back} onSaved={back} />;
}
