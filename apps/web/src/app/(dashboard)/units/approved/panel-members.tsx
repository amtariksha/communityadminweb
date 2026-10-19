import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { ClickableEmail, ClickablePhone } from '@/components/ui/clickable-contact';
import type { UnitPanelMember } from '@/hooks/use-unit-panel';
import { formatDate } from '@/lib/utils';
import { PanelSection } from './panel-section';
import { memberTypeLabel } from './unit-labels';

function MemberCard({ member }: { member: UnitPanelMember }): ReactNode {
  return (
    <li className="space-y-1 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{member.name ?? 'Unknown'}</span>
        <Badge variant="secondary">{memberTypeLabel(member.member_type)}</Badge>
        {member.is_primary_contact && <Badge variant="outline">Primary Contact</Badge>}
      </div>
      {member.phone && (
        <p className="text-xs">
          <ClickablePhone phone={member.phone} />
        </p>
      )}
      {member.email && (
        <p className="text-xs">
          <ClickableEmail email={member.email} />
        </p>
      )}
      <p className="text-xs text-muted-foreground">Since {formatDate(member.move_in_date)}</p>
    </li>
  );
}

/** Unit Members: one card per current owner and tenant. */
export function PanelMembers({ members, count }: { members: UnitPanelMember[]; count: number }): ReactNode {
  return (
    <PanelSection title="Unit Members" count={count}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </ul>
    </PanelSection>
  );
}
