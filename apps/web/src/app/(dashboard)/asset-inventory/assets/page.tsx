import { redirect } from 'next/navigation';

// Asset & Inventory › Assets opens on Active Assets.
export default function Page(): never {
  redirect('/asset-inventory/assets/active');
}
