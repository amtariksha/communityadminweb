import type { Metadata } from 'next';
import { LegalPageRenderer } from '../legal-page-renderer';

export const metadata: Metadata = {
  title: 'Terms & Conditions · Eassy Society',
};

export default function LegalTermsPage() {
  return <LegalPageRenderer type="terms_and_conditions" />;
}
