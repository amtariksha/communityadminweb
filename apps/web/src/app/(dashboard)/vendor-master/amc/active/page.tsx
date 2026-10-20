import { type ReactNode } from 'react';
import { AmcListPage } from '../amc-routes';

// Vendor Master › AMCs › Active AMCs (VEND-S5).
export default function Page(): ReactNode {
  return <AmcListPage view="active" />;
}
