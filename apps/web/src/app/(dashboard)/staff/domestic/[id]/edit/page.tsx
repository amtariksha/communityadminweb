import { type ReactNode } from 'react';
import { EditDomesticPage } from '../../domestic-form-page';

// Staff Manager › Edit Household Help (STAFF-42).
export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<ReactNode> {
  const { id } = await params;
  return <EditDomesticPage id={id} />;
}
