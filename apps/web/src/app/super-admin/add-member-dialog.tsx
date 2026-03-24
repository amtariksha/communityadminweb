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
import { useAddMemberWithRoles, useTenants } from '@/hooks';

const ASSIGNABLE_ROLES = [
  { slug: 'community_admin', label: 'Community Admin', description: 'Facility manager — full society access including billing, gate, staff, and settings' },
  { slug: 'committee_member', label: 'Committee Member', description: 'Full admin access — manages society settings, approvals, and all modules' },
  { slug: 'accountant', label: 'Accountant', description: 'Manages finances — invoices, receipts, ledger, bank, and vendor payments' },
  { slug: 'moderator', label: 'Moderator', description: 'Day-to-day operations — units, documents, and member communication' },
  { slug: 'security_guard', label: 'Security Guard', description: 'Gate operations — visitor check-in/out, staff attendance, parcels' },
  { slug: 'auditor', label: 'Auditor', description: 'Read-only access to financial records and reports for audit purposes' },
  { slug: 'owner', label: 'Owner', description: 'Flat/unit owner — can view their own invoices, receipts, and documents' },
  { slug: 'tenant_resident', label: 'Tenant / Resident', description: 'Renting resident — can view their own invoices and society documents' },
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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const tenantsQuery = useTenants({ limit: 100 });
  const addMember = useAddMemberWithRoles();

  const tenantsList = tenantsQuery.data?.data ?? [];
  const effectiveTenantId = preselectedTenantId ?? selectedTenantId;

  function resetForm(): void {
    setPhone('');
    setSelectedTenantId('');
    setSelectedRoles([]);
  }

  function toggleRole(slug: string): void {
    setSelectedRoles((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug],
    );
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!effectiveTenantId || !phone || selectedRoles.length === 0) return;

    addMember.mutate(
      { tenant_id: effectiveTenantId, phone, roles: selectedRoles },
      {
        onSuccess(results) {
          const isNew = results[0]?.user.is_new;
          const roleLabels = selectedRoles
            .map((slug) => ASSIGNABLE_ROLES.find((r) => r.slug === slug)?.label)
            .filter(Boolean)
            .join(', ');
          addToast({
            title: isNew ? 'User created & roles assigned' : 'Roles assigned',
            description: `Assigned ${roleLabels} to ${phone}`,
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
              <Label>Roles <span className="text-xs text-muted-foreground font-normal">(select one or more)</span></Label>
              <div className="grid gap-2 max-h-56 overflow-y-auto rounded-md border p-2">
                {ASSIGNABLE_ROLES.map((r) => (
                  <label
                    key={r.slug}
                    className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors hover:bg-accent ${
                      selectedRoles.includes(r.slug) ? 'border-primary bg-primary/5' : 'border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={r.slug}
                      checked={selectedRoles.includes(r.slug)}
                      onChange={() => toggleRole(r.slug)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedRoles.length === 0 && (
                <p className="text-xs text-destructive">Select at least one role</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!effectiveTenantId || !phone || selectedRoles.length === 0 || addMember.isPending}
            >
              {addMember.isPending ? 'Adding...' : `Add Member${selectedRoles.length > 1 ? ` (${selectedRoles.length} roles)` : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
