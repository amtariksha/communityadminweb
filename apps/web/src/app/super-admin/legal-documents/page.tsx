import type { Metadata } from 'next';
import { BRAND } from '@/config/branding';
import LegalDocumentsContent from './legal-documents-content';

export const metadata: Metadata = {
  title: `Legal Documents — Super Admin · ${BRAND.appName}`,
};

export default function LegalDocumentsPage() {
  return <LegalDocumentsContent />;
}
