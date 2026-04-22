import type { Metadata } from 'next';
import TaxContent from './tax-content';

export const metadata: Metadata = {
  title: 'Tax & Compliance — CommunityOS',
};

export default function Page() {
  return <TaxContent />;
}
