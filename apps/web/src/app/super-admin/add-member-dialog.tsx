'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useAddMemberToTenant, useTenants } from '@/hooks';

const ASSIGNABLE_ROLES = [
  { slug: 'committee_member', label: 'Committee Member' },
  { slug: 'accountant', label: 'Accountant' },
  { slug: 'moderator', label: 'Moderator' },
  { slug: 'auditor', label: 'Auditor' },
  { slug: 'owner', label: 'Owner' },
  { slug: 'tenant_resident', label: 'Tenant / Resident' },
];

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
  tenantName?: string;
}

export default function AddMemberDialog({
  open,
  onOpenChange,
  tenantId: preselectedTenantId,
  tenantName,
}: AddMemberDialogProps): ReactNode {
  const { addToast } = useToast();

  const [phone, setPhone] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const tenantsQuery = useTenants({ limit: 100 });
  const addMember = useAddMemberToTenant();

  const tenantsList = tenantsQuery.data?.data ?? [];
  const effectiveTenantId = preselectedTenantId ?? selectedTenantId;

  function resetForm(): void {
    setPhone('');
    setSelectedTenantId('');
    setSelectedRole('');
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!effectiveTenantId || !phone || !selectedRole) return;

    addMember.mutate(
      { tenant_id: effectiveTenantId, phone, role: selectedRole },
      {
        onSuccess(data) {
          addToast({
            title: data.user.is_new ? 'User created & role assigned' : 'Role assigned',
            description: data.message,
            variant: 'success',
          });
          resetForm();
          onOpenChange(false);
        },
        onError(error) {
          addToast({
            title: 'Failed to add member',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); onOpenChange(isOpen); }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Member to Society
            </DialogTitle>
            <DialogDescription>
              {tenantName
                ? `Add a user to ${tenantName}. If the phone number is new, the user will be created automatically.`
                : 'Select a society and add a user by phone. If the phone is new, the user will be created automatically.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-phone">Phone Number</Label>
              <Input
                id="member-phone"
                required
                placeholder="+91XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                pattern="^\+91\d{10}$"
                title="Phone must be +91 followed by 10 digits"
              />
              <p className="text-xs text-muted-foreground">
                Indian mobile number in +91XXXXXXXXXX format
              </p>
            </div>

            {!preselectedTenantId && (
              <div className="space-y-2">
                <Label htmlFor="member-tenant">Society</Label>
                <Select
                  id="member-tenant"
                  required
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                >
                  <option value="">Select society...</option>
                  {tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <Select
                id="member-role"
                required
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="">Select role...</option>
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.slug} value={r.slug}>{r.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!effectiveTenantId || !phone || !selectedRole || addMember.isPending}
            >
              {addMember.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
