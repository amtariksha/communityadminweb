import { type ReactNode } from 'react';
import AccountDetailContent from './account-detail-content';

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AccountDetailPage({ params }: AccountDetailPageProps): ReactNode {
  return <AccountDetailContent params={params} />;
}
