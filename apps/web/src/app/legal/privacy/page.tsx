import type { Metadata } from 'next';
import { LegalPageRenderer } from '../legal-page-renderer';

export const metadata: Metadata = {
  title: 'Privacy Policy · Mera Ghar',
};

export default function LegalPrivacyPage() {
  return <LegalPageRenderer type="privacy_policy" />;
}
