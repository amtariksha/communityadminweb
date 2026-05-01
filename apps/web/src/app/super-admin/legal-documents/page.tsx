import type { Metadata } from 'next';
import LegalDocumentsContent from './legal-documents-content';

export const metadata: Metadata = {
  title: 'Legal Documents — Super Admin · Eassy Society',
};

export default function LegalDocumentsPage() {
  return <LegalDocumentsContent />;
}
