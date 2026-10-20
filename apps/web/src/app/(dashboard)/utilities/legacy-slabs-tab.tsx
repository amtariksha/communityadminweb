'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useSlabs, useCreateSlab, useDeleteSlab } from '@/hooks';
import type { Slab } from '@/hooks/use-utilities';
import { METER_TYPES, meterTypeIcon, today } from './utility-ui';

/**
 * The Slab Rates tab as it was before meter rules (UTIL-13): one slab at a
 * time. Shown only against an API without meter rules (404 on
 * GET /utilities/rules).
 */
export function LegacySlabsTab(): ReactNode {
  const { addToast } = useToast();
  const [typeFilter, setTypeFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formType, setFormType] = useState<'water' | 'electricity' | 'gas'>('water');
  const [formFrom, setFormFrom] = useState('0');
  const [formTo, setFormTo] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formEffFrom, setFormEffFrom] = useState(today());
  const [formLabel, setFormLabel] = useState('');

  const slabsQuery = useSlabs(typeFilter || undefined);
  const createMutation = useCreateSlab();
  const deleteMutation = useDeleteSlab();

  const slabs = slabsQuery.data ?? [];

  function handleCreate(): void {
    if (!formRate) {
      addToast({ title: 'Rate per unit is required', variant: 'destructive' });
      return;
    }

    createMutation.mutate(
      {
        meter_type: formType,
        slab_from: parseFloat(formFrom) || 0,
        slab_to: formTo ? parseFloat(formTo) : null,
        rate_per_unit: parseFloat(formRate),
        effective_from: formEffFrom,
        label: formLabel || null,
      },
      {
        onSuccess() {
          addToast({ title: 'Slab rate created', variant: 'success' });
          setCreateOpen(false);
          setFormFrom('0');
          setFormTo('');
          setFormRate('');
          setFormLabel('');
        },
        onError(error) {
          addToast({ title: 'Failed to create slab', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleDelete(slabId: string): void {
    deleteMutation.mutate(slabId, {
      onSuccess() {
        addToast({ title: 'Slab deleted', variant: 'success' });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Slab Rates</CardTitle>
          <div className="flex items-center gap-3">
            {/* UTIL-06: utility invoices' own interest and due days. */}
            <Link href="/utilities/setup/interest" className="text-sm text-primary hover:underline">
              Late payment interest — utilities
            </Link>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {METER_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Slab
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Range (units)</TableHead>
              <TableHead>Rate/Unit</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slabsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : slabs.length > 0 ? (
              slabs.map((slab) => (
                <TableRow key={slab.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {meterTypeIcon(slab.meter_type)}
                      <span className="capitalize">{slab.meter_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {Number(slab.slab_from)} – {slab.slab_to !== null ? Number(slab.slab_to) : '∞'}
                  </TableCell>
                  <TableCell>{formatCurrency(Number(slab.rate_per_unit))}</TableCell>
                  <TableCell className="text-muted-foreground">{slab.label ?? '—'}</TableCell>
                  <TableCell>{formatDate(slab.effective_from)}</TableCell>
                  <TableCell>{slab.effective_to ? formatDate(slab.effective_to) : '—'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleDelete(slab.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No slab rates configured. Add slabs to enable bill calculation.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create slab dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Slab Rate</DialogTitle>
            <DialogDescription>Define a pricing tier for metered billing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Meter Type</Label>
              <Select value={formType} onChange={(e) => setFormType(e.target.value as 'water' | 'electricity' | 'gas')}>
                {METER_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From (units)</Label>
                <Input type="number" value={formFrom} onChange={(e) => setFormFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To (units)</Label>
                <Input type="number" placeholder="∞ if empty" value={formTo} onChange={(e) => setFormTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rate per Unit (₹)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 5.00" value={formRate} onChange={(e) => setFormRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input placeholder="e.g. Basic tier" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input type="date" value={formEffFrom} onChange={(e) => setFormEffFrom(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button disabled={createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? 'Creating...' : 'Add Slab'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
