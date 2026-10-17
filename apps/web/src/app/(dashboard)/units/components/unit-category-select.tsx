import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { MemberCategory } from '@/hooks';

interface UnitCategorySelectProps {
  categories: MemberCategory[];
  /** The unit's category id, or '' for none. */
  value: string;
  onChange: (categoryId: string) => void;
}

/**
 * Member category of a unit, on the Details tab of the unit dialog. Left out
 * when the society has defined no categories and the unit holds none, so a
 * society that does not use categories sees nothing new.
 */
export function UnitCategorySelect({
  categories,
  value,
  onChange,
}: UnitCategorySelectProps): ReactNode {
  if (categories.length === 0 && !value) return null;
  return (
    <div className="space-y-2">
      <Label htmlFor="edit-unit-category">Member category</Label>
      <Select
        id="edit-unit-category"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
