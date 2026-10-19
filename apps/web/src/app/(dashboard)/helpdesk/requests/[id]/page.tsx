'use client';

import { use, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminLayout } from '@/lib/layout-context';
import { RequestRecord } from './request-record';

interface PageProps {
  params: Promise<{ id: string }>;
}

// HelpDesk Tracker › Open Requests › View: the request record (HELP-19, screen HELP-S9).
export default function RequestRecordPage({ params }: PageProps): ReactNode {
  const { id } = use(params);
  const router = useRouter();
  const list = useAdminLayout() === 'classic' ? '/helpdesk/open' : '/tickets';
  return <RequestRecord ticketId={id} onClose={() => router.push(list)} />;
}
