export type UnitType = 'flat' | 'shop' | 'office' | 'parking' | 'other';

export interface Unit {
  id: string;
  tenant_id: string;
  unit_number: string;
  floor: number;
  block: string | null;
  area_sqft: number;
  unit_type: UnitType;
  is_occupied: boolean;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  // Joined fields returned by the list / directory queries.
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
  tenant_email?: string | null;
}

export type MemberType = 'owner' | 'tenant' | 'family_member' | 'owner_family' | 'tenant_family';

export interface Member {
  id: string;
  tenant_id: string;
  unit_id: string;
  user_id: string;
  member_type: MemberType;
  move_in_date: string | Date;
  move_out_date: string | Date | null;
  is_primary_contact: boolean;
  is_active: boolean;
  created_at: string | Date;
  // Joined fields returned by member directory queries.
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  unit_number?: string;
}
