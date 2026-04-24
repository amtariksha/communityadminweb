import { Suspense, type ReactNode } from 'react';
import TicketsContent from './tickets-content';

export default function TicketsPage(): ReactNode {
  return (
    <Suspense fallback={null}>
      <TicketsContent />
    </Suspense>
  );
}
