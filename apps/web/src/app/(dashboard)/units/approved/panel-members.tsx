'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ClickableEmail, ClickablePhone } from '@/components/ui/clickable-contact';
import type { UnitPanelMember } from '@/hooks/use-unit-panel';
import { formatDate } from '@/lib/utils';
import { memberTags } from '../components/member-form-values';
import { PanelSection } from './panel-section';
import { memberTypeLabel } from './unit-labels';
import type { PanelActions } from './use-panel-actions';

/** Today's unit dialog holds Add Owner / Tenant, Onboard Tenant, Transfer Ownership and Extend Lease. */
export const unitDialogHref = (unitId: string): string => `/units?unit=${unitId}`;

const LINK_BUTTON = buttonVariants({ variant: 'outline', size: 'sm' });

interface CardProps {
  member: UnitPanelMember;
  unitId: string;
  actions: PanelActions;
  onEdit: (member: UnitPanelMember) => void;
}

function confirmMoveOut(member: UnitPanelMember): boolean {
  const today = new Date().toLocaleDateString('en-GB');
  return window.confirm(`Move out ${member.name ?? 'this member'} as of ${today}? Their app access to this unit ends.`);
}

function CardActions({ member, unitId, actions, onEdit }: CardProps): ReactNode {
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(member)}>
        Edit
      </Button>
      {!member.is_primary_contact && (
        <Button type="button" variant="outline" size="sm" onClick={() => actions.makePrimary(member.id)}>
          Make Primary Contact
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => confirmMoveOut(member) && actions.moveOut(member.id)}>
        Move Out
      </Button>
      {member.member_type === 'owner' && (
        <Link href={unitDialogHref(unitId)} className={LINK_BUTTON}>
          Transfer Ownership
        </Link>
      )}
      {member.member_type === 'tenant' && (
        <>
          <Link href={unitDialogHref(unitId)} className={LINK_BUTTON}>
            Extend Lease
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.confirm('Disconnect this tenant and their family from the unit?') && actions.disconnectTenant()}
          >
            Disconnect Tenant
          </Button>
        </>
      )}
    </div>
  );
}

function MemberCard(props: CardProps): ReactNode {
  const { member } = props;
  return (
    <li className="space-y-1 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{member.name ?? 'Unknown'}</span>
        <Badge variant="secondary">{memberTypeLabel(member.member_type)}</Badge>
        {memberTags(member).map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
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
      <CardActions {...props} />
    </li>
  );
}

interface PanelMembersProps {
  members: UnitPanelMember[];
  count: number;
  unitId: string;
  actions: PanelActions;
  onEdit: (member: UnitPanelMember) => void;
}

/** Unit Members: one card per current owner and tenant, with the card and section actions (UNIT-S7). */
export function PanelMembers({ members, count, unitId, actions, onEdit }: PanelMembersProps): ReactNode {
  return (
    <PanelSection
      title="Unit Members"
      count={count}
      actions={
        <>
          <Link href={unitDialogHref(unitId)} className={LINK_BUTTON}>
            Add Owner
          </Link>
          <Link href={unitDialogHref(unitId)} className={LINK_BUTTON}>
            Add Tenant
          </Link>
          <Link href={unitDialogHref(unitId)} className={LINK_BUTTON}>
            Onboard Tenant
          </Link>
        </>
      }
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} unitId={unitId} actions={actions} onEdit={onEdit} />
        ))}
      </ul>
    </PanelSection>
  );
}
