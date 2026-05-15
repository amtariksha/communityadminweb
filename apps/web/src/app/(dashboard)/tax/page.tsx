import type { Metadata } from 'next';
import { BRAND } from '@/config/branding';
import TaxContent from './tax-content';

export const metadata: Metadata = {
  title: `Tax & Compliance — ${BRAND.appName}`,
};

export default function Page() {
  return <TaxContent />;
}
