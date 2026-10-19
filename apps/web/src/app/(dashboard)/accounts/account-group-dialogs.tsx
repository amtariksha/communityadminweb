'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { AccountGroup, AccountType } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useCreateAccountGroup, useUpdateAccountGroup } from '@/hooks';

export const GROUP_TYPES: ReadonlyArray<{ value: AccountType; label: string }> = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

export function groupTypeLabel(type: string): string {
  return GROUP_TYPES.find((option) => option.value === type)?.label ?? type;
}

interface CreateGroupFormProps {
  idPrefix: string;
  description: string;
  groups: AccountGroup[];
  onCreated: (group: AccountGroup) => void;
}

/** A child group must share its parent's type, so the parent list follows the chosen type. */
function CreateGroupForm({ idPrefix, description, groups, onCreated }: CreateGroupFormProps): ReactNode {
  const { addToast } = useToast();
  const createGroup = useCreateAccountGroup();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<AccountType>('asset');
  const [parentId, setParentId] = useState('');
  const parents = groups.filter((group) => group.type === type && group.is_active !== false);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    createGroup.mutate(
      { name, code, type, parent_id: parentId || null },
      {
        onSuccess(response) {
          addToast({ title: 'Account group created', variant: 'success' });
          onCreated(response.data);
        },
        onError(error) {
          addToast({ title: 'Failed to create group', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create Account Group</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`}>Group Name</Label>
          <Input id={`${idPrefix}-name`} placeholder="e.g., Fixed Assets" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-code`}>Group Code</Label>
          <Input id={`${idPrefix}-code`} placeholder="e.g., 1300" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-type`}>Type</Label>
          <Select
            id={`${idPrefix}-type`}
            value={type}
            onChange={(e) => { setType(e.target.value as AccountType); setParentId(''); }}
            required
          >
            {GROUP_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-parent`} className="flex items-center gap-1">
            Parent Group
            <HelpTooltip text="Root groups (no parent) are top-level categories like Income, Expense, Assets, Liabilities. Sub-groups nest under a parent of the same type." />
          </Label>
          <Select id={`${idPrefix}-parent`} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">No parent (root group)</option>
            {parents.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </Select>
        </div>
      </div>
      <DialogFooter>
        <DialogClose>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={createGroup.isPending}>
          {createGroup.isPending ? 'Creating...' : 'Create Group'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddAccountGroupDialog({ groups }: { groups: AccountGroup[] }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <CreateGroupForm
          idPrefix="group"
          description="Add a new group to organize your accounts"
          groups={groups}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface InlineAccountGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: AccountGroup[];
  onCreated: (group: AccountGroup) => void;
}

/** Opened from the Add Account form; the new group becomes the account's group. */
export function InlineAccountGroupDialog({ open, onOpenChange, groups, onCreated }: InlineAccountGroupDialogProps): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <CreateGroupForm
          idPrefix="inline-group"
          description="Quickly add a new group for this account"
          groups={groups}
          onCreated={(group) => { onOpenChange(false); onCreated(group); }}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditGroupForm({ group, onDone }: { group: AccountGroup; onDone: () => void }): ReactNode {
  const { addToast } = useToast();
  const updateGroup = useUpdateAccountGroup();
  const [name, setName] = useState(group.name);
  const [code, setCode] = useState(group.code);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    updateGroup.mutate(
      { id: group.id, data: { name, code } },
      {
        onSuccess() {
          addToast({ title: 'Account group updated', variant: 'success' });
          onDone();
        },
        onError(error) {
          addToast({ title: 'Failed to update group', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Edit Account Group</DialogTitle>
        <DialogDescription>Update group details</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-group-name">Group Name</Label>
          <Input id="edit-group-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-group-code">Group Code</Label>
          <Input id="edit-group-code" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-group-type">Type</Label>
          <Input id="edit-group-type" value={groupTypeLabel(group.type)} readOnly disabled />
          <p className="text-xs text-muted-foreground">
            A group&apos;s type cannot be changed: its accounts were opened on that type&apos;s debit or credit side.
          </p>
        </div>
      </div>
      <DialogFooter>
        <DialogClose>
          <Button type="button" variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={updateGroup.isPending}>
          {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Open while `group` is set; closing clears it. */
export function EditAccountGroupDialog({ group, onClose }: { group: AccountGroup | null; onClose: () => void }): ReactNode {
  return (
    <Dialog open={group !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        {group ? <EditGroupForm key={group.id} group={group} onDone={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}
