'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useAddAssetCategory } from '@/hooks/use-asset-categories';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';

/** "+ Add Asset Category" on the AMC form (VEND-S8): one more category of the society. */
export function AddCategoryDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }): ReactNode {
  const { addToast } = useToast();
  const add = useAddAssetCategory();
  const [name, setName] = useState('');

  function submit(event: FormEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!name.trim()) return;
    add.mutate(name.trim(), {
      onSuccess(category) {
        onAdded(category.id);
        setName('');
        onClose();
      },
      onError(error) {
        const description = isNotDeployed(error) ? 'Asset categories are not available yet.' : friendlyError(error);
        addToast({ title: 'Could not add the category', description, variant: 'destructive' });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader><DialogTitle>Add Asset Category</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="new-asset-category">Category</Label>
            <Input id="new-asset-category" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={add.isPending || !name.trim()}>Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
