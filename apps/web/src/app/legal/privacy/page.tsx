import type { Metadata } from 'next';
import { BRAND } from '@/config/branding';
import { LegalPageRenderer } from '../legal-page-renderer';

export const metadata: Metadata = {
  title: `Privacy Policy · ${BRAND.appName}`,
};

export default function LegalPrivacyPage() {
  return <LegalPageRenderer type="privacy_policy" />;
}
