import Link from 'next/link';
import { type ReactNode } from 'react';
import { SetupBlock } from './setup-block';

// Our resident types are fixed roles (decision GATE-D5), shown read-only.
const RESIDENT_CATEGORIES = ['Owner', 'Owner family', 'Tenant', 'Tenant family'] as const;

/** Block 5 — Resident Categories (read-only), linking to the users. */
export function ResidentCategoriesBlock(): ReactNode {
  return (
    <SetupBlock title="Resident Categories">
      <ul className="mb-3 list-inside list-disc text-sm">
        {RESIDENT_CATEGORIES.map((category) => (
          <li key={category}>{category}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        These are fixed. See who is in each under{' '}
        <Link href="/units/approved" className="text-primary underline">
          Units &amp; Users › Approved Users
        </Link>
        .
      </p>
    </SetupBlock>
  );
}

/** Block 7 — Emergency Numbers: kept with the society profile. */
export function EmergencyNumbersBlock(): ReactNode {
  return (
    <SetupBlock title="Emergency Numbers">
      <p className="text-sm text-muted-foreground">
        The numbers guards can dial from the gate are set under{' '}
        <Link href="/society-profile/emergency" className="text-primary underline">
          Society Profile › Emergency Contacts
        </Link>
        .
      </p>
    </SetupBlock>
  );
}
