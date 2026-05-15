import type { Metadata } from 'next';
import { BRAND } from '@/config/branding';
import { LegalPageRenderer } from '../legal-page-renderer';

export const metadata: Metadata = {
  title: `Terms & Conditions · ${BRAND.appName}`,
};

export default function LegalTermsPage() {
  return <LegalPageRenderer type="terms_and_conditions" />;
}
