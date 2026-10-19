import { redirect } from 'next/navigation';

// Asset & Inventory › Inventory opens on Active.
export default function Page(): never {
  redirect('/asset-inventory/inventory/active');
}
