import { redirect } from 'next/navigation';

// Expense Tracker › By Vendors opens on SubLedgers (EXP-16).
export default function Page(): never {
  redirect('/expense-tracker/by-vendors/subledgers');
}
