'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCreateCategory } from '@/hooks';

/** Create Category on the standard Documents page. */
export function CreateCategoryDialog(): ReactNode {
  const { addToast } = useToast();
  const createCategory = useCreateCategory();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  function handleCreateCategory(e: FormEvent): void {
    e.preventDefault();
    createCategory.mutate(
      { name: categoryName },
      {
        onSuccess() {
          setCategoryDialogOpen(false);
          setCategoryName('');
          addToast({ title: 'Category created successfully', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create category', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
    <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
      <DialogTrigger>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreateCategory}>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new document category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                placeholder="e.g., Insurance"
                required
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
