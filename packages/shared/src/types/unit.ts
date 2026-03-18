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
  created_at: Date;
  updated_at: Date;
}

export type MemberType = 'owner' | 'tenant' | 'family_member';

export interface Member {
  id: string;
  tenant_id: string;
  unit_id: string;
  user_id: string;
  member_type: MemberType;
  move_in_date: Date;
  move_out_date: Date | null;
  is_primary_contact: boolean;
  is_active: boolean;
  created_at: Date;
}
