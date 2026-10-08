'use client';

import { useState } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useMemberCategories, useCreateMemberCategory, useDeleteMemberCategory } from '@/hooks';

export function MemberCategoriesContent() {
  const { data: categories = [], isLoading } = useMemberCategories();
  const createCategory = useCreateMemberCategory();
  const deleteCategory = useDeleteMemberCategory();
  const { addToast: toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createCategory.mutateAsync({ name, description, color });
      toast({ title: 'Success', description: 'Member category created' });
      setName('');
      setDescription('');
      setColor('#3B82F6');
      setOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Category removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Categories"
        description="Tag and classify residents (Senior Citizen, Differently Abled, Committee Member, etc.) for priority queues and targeted notices."
        breadcrumbs={[
          { label: 'Management', href: '/units' },
          { label: 'Member Categories' },
        ]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Add Member Category</DialogTitle>
                  <DialogDescription>
                    Create a custom category tag to assign to society flats and residents.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Category Name *</Label>
                    <Input
                      id="cat-name"
                      placeholder="e.g. Senior Citizen, Differently Abled, Single Lady"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-desc">Description</Label>
                    <Input
                      id="cat-desc"
                      placeholder="Optional notes or eligibility criteria"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-color">Color Badge</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="cat-color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-10 w-16 cursor-pointer rounded border p-1"
                      />
                      <Badge style={{ backgroundColor: color, color: '#fff' }}>
                        {name || 'Preview Badge'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createCategory.isPending}>
                    Save Category
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Active Member Categories</CardTitle>
          <CardDescription>
            Categories actively used across society units and helpdesk priority routing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Tag className="mb-2 h-10 w-10 text-muted-foreground/60" />
              <p className="text-base font-medium">No member categories yet</p>
              <p className="text-sm">Click &quot;Add Category&quot; to define Senior Citizen, Committee Member, etc.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned Units</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      <Badge style={{ backgroundColor: cat.color, color: '#fff' }}>
                        {cat.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.description || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{cat.member_count ?? 0}</span> unit(s)
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cat.id)}
                        disabled={deleteCategory.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
