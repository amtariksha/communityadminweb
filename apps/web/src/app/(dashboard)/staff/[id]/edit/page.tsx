import { type ReactNode } from 'react';
import { EditStaffPage } from '../../employee-form/employee-form-page';

// Staff Manager › Edit Staff (STAFF-10, screen STAFF-S3).
export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<ReactNode> {
  const { id } = await params;
  return <EditStaffPage id={id} />;
}
