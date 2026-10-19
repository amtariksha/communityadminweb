'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { FormFieldError } from '@/components/ui/form-field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useRegisterUnitWorker, WORKER_CATEGORIES } from '@/hooks/use-unit-workers';
import { friendlyError } from '@/lib/api-error';
import { normalizePhone, validateName } from '@/lib/validation';

type Category = (typeof WORKER_CATEGORIES)[number];

/** + Create New Staff on the unit panel (UNIT-17): a household worker of this unit. */
export function StaffForm({ unitId, open, onClose }: { unitId: string; open: boolean; onClose: () => void }): ReactNode {
  const register = useRegisterUnitWorker();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<Category>('maid');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  function save(): void {
    const checkedName = validateName(name);
    const checkedPhone = normalizePhone(phone);
    const found = {
      name: checkedName.ok ? undefined : checkedName.error,
      phone: !checkedPhone.ok ? checkedPhone.error : checkedPhone.value ? undefined : 'Phone is required.',
    };
    setErrors(found);
    if (!checkedName.ok || !checkedPhone.ok || !checkedPhone.value) return;
    register.mutate(
      { unit_id: unitId, name: checkedName.value, phone: checkedPhone.value, category },
      {
        onSuccess: () => {
          addToast({ title: 'Staff added to the unit', variant: 'success' });
          onClose();
        },
        onError: (error) => addToast({ title: 'Could not add the staff', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <FormFrame mode="dialog" open={open} title="Create New Staff" onClose={onClose} onSave={save} saving={register.isPending}>
      <div className="space-y-1">
        <Label htmlFor="staff-name">Name</Label>
        <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} />
        <FormFieldError message={errors.name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="staff-phone">Phone/Mobile</Label>
        <Input id="staff-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <FormFieldError message={errors.phone} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="staff-category">Category</Label>
        <Select id="staff-category" value={category} onChange={(event) => setCategory(event.target.value as Category)}>
          {WORKER_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/^./, (c) => c.toUpperCase())}
            </option>
          ))}
        </Select>
      </div>
    </FormFrame>
  );
}
