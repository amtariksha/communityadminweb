import { type ReactNode } from 'react';
import { TaxRegisterPage } from '../tax-register-page';

// Bank & Cash › Taxes › Central GST (BANK-15 / BANK-16).
export default function Page(): ReactNode {
  return <TaxRegisterPage register="cgst" />;
}
