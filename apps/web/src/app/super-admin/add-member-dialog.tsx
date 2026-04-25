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
import { normalizePhone } from '@/lib/validation';
import { FormFieldError } from '@/components/ui/form-field-error';
import { UserSearchSelect } from '@/components/ui/user-search-select';
import type { UserSearchHit } from '@/hooks/use-user-search';
import { ASSIGNABLE_ROLES } from '@/lib/role-catalogue';

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
  // Cross-tenant directory hit picked via UserSearchSelect. When set,
  // we know the existing users row id + its tenant_roles in other
  // societies, which we can surface to the operator as context (so
  // they don't accidentally pile a community_admin role onto someone
  // who's already a resident across the platform).
  const [selectedUser, setSelectedUser] = useState<UserSearchHit | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const tenantsQuery = useTenants({ limit: 100 });
  const addMember = useAddMemberWithRoles();

  const tenantsList = tenantsQuery.data?.data ?? [];
  const effectiveTenantId = preselectedTenantId ?? selectedTenantId;

  function resetForm(): void {
    setPhone('');
    setSelectedUser(null);
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

    // Prefer the directory hit's exact phone — guarantees no duplicate
    // users row gets created when the operator just glanced past the
    // autocomplete. Fall back to the typed value (silent no-match
    // flow per the unified-directory plan).
    const rawPhone = selectedUser?.phone ?? phone;
    // The HTML5 `pattern="^\+91\d{10}$"` gate only catches missing-+91
    // and length mismatches — it still lets 0/1/2/3/4/5-start numbers
    // through. normalizePhone enforces the Indian mobile 6-9 first-
    // digit rule and also accepts a bare 10-digit number, canonicalising
    // to +91XXXXXXXXXX before we hit the backend.
    const normalized = normalizePhone(rawPhone);
    if (!normalized.ok || !normalized.value) {
      addToast({
        title: 'Invalid phone number',
        description: normalized.ok
          ? 'Phone is required.'
          : normalized.error,
        variant: 'destructive',
      });
      return;
    }

    addMember.mutate(
      { tenant_id: effectiveTenantId, phone: normalized.value, roles: selectedRoles },
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
              <Label>Phone Number</Label>
              <UserSearchSelect
                scope="super-admin"
                value={selectedUser}
                placeholder="Search every society by phone or name…"
                onChange={(hit) => {
                  setSelectedUser(hit);
                  if (hit) setPhone(hit.phone);
                }}
                onQueryChange={(q) => {
                  // Track typed value so the form submits cleanly when
                  // no autocomplete row matches (silent no-match flow).
                  setPhone(q);
                }}
              />
              {selectedUser && selectedUser.roles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Existing roles across the platform:{' '}
                  {selectedUser.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}
                </p>
              )}
              <FormFieldError error={addMember.error} field="phone" />
              <p className="text-xs text-muted-foreground">
                Indian mobile number — 10 digits starting 6/7/8/9, with or without +91.
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
