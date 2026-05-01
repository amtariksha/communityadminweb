import type { Metadata } from 'next';
import { LegalPageRenderer } from '../legal-page-renderer';

export const metadata: Metadata = {
  title: 'Privacy Policy · Eassy Society',
};

export default function LegalPrivacyPage() {
  return <LegalPageRenderer type="privacy_policy" />;
}
