'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { useAdminLayout } from '@/lib/layout-context';
import { CreateRequestForm } from './create-request-form';

/**
 * /helpdesk/new: Create Request as its own page (SB-07). Saving opens the
 * new request on Open Requests until the record page exists (HELP-19);
 * Close goes back to the list. A standard-layout deep link gets the same
 * page and returns to /tickets.
 */
export function CreateRequestPage(): ReactNode {
  const router = useRouter();
  const list = useAdminLayout() === 'classic' ? '/helpdesk/open' : '/tickets';

  return (
    <CreateRequestForm
      mode="page"
      onClose={() => router.push(list)}
      onSaved={(ticket) => router.push(list === '/tickets' ? list : `${list}?view=${ticket.id}`)}
    />
  );
}
