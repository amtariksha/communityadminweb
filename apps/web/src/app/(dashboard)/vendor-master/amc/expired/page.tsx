import { type ReactNode } from 'react';
import { AmcListPage } from '../amc-routes';

// Vendor Master › AMCs › Expired AMCs (VEND-S6).
export default function Page(): ReactNode {
  return <AmcListPage view="expired" />;
}
