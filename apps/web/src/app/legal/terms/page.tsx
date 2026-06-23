import type { Metadata } from 'next';
import { LegalPageRenderer } from '../legal-page-renderer';

export const metadata: Metadata = {
  title: 'Terms & Conditions · Mera Ghar',
};

export default function LegalTermsPage() {
  return <LegalPageRenderer type="terms_and_conditions" />;
}
