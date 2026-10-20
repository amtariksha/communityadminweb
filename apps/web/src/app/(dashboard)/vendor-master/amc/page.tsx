import { redirect } from 'next/navigation';

// Vendor Master › AMCs opens on Active AMCs (VEND-S5).
export default function Page(): never {
  redirect('/vendor-master/amc/active');
}
