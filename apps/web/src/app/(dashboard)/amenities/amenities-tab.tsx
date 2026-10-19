'use client';

import { useState, type ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { useAmenities, useUpdateAmenity, type Amenity } from '@/hooks';
import { friendlyError } from '@/lib/api-error';
import { formatCurrency } from '@/lib/utils';
import { amenityTypeIcon, formatAmenityType, formatPricingType } from './amenity-labels';
import { AmenityForm } from './components/amenity-form';

const COLUMNS = ['Name', 'Type', 'Location', 'Capacity', 'Pricing', 'Status', 'Actions'];

function AmenityRow({ amenity, onEdit, onToggle }: { amenity: Amenity; onEdit: () => void; onToggle: () => void }): ReactNode {
  return (
    <TableRow>
      <TableCell className="font-medium">{amenity.name}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span>{amenityTypeIcon(amenity.amenity_type)}</span>
          <span>{formatAmenityType(amenity.amenity_type)}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{amenity.location ?? '-'}</TableCell>
      <TableCell>{amenity.capacity ?? '-'}</TableCell>
      <TableCell>
        <div className="text-sm">
          <span className="capitalize">{formatPricingType(amenity.pricing_type)}</span>
          {amenity.pricing_type !== 'free' && amenity.price_per_unit > 0 && (
            <span className="text-muted-foreground"> - {formatCurrency(amenity.price_per_unit)}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={amenity.is_active ? 'success' : 'secondary'}>{amenity.is_active ? 'Active' : 'Inactive'}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit} title="Edit amenity">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onToggle} title={amenity.is_active ? 'Deactivate' : 'Activate'}>
            {amenity.is_active ? <X className="h-4 w-4 text-red-500" /> : <span className="text-xs font-bold text-green-500">ON</span>}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function useToggleActive() {
  const { addToast } = useToast();
  const update = useUpdateAmenity();
  return (amenity: Amenity) =>
    update.mutate(
      { id: amenity.id, is_active: !amenity.is_active },
      {
        onSuccess: () => addToast({ title: `${amenity.name} ${amenity.is_active ? 'deactivated' : 'activated'}`, variant: 'success' }),
        onError: (error) => addToast({ title: 'Failed to update amenity', description: friendlyError(error), variant: 'destructive' }),
      },
    );
}

interface AmenitiesTabProps {
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
}

/** Standard /amenities › Amenities: every amenity, Edit and Activate / Deactivate, forms in dialogs. */
export function AmenitiesTab({ createOpen, setCreateOpen }: AmenitiesTabProps): ReactNode {
  const amenitiesQuery = useAmenities();
  const toggleActive = useToggleActive();
  const [editing, setEditing] = useState<Amenity | null>(null);
  const amenities = amenitiesQuery.data?.data ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column} className={column === 'Actions' ? 'w-28' : undefined}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {amenitiesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {COLUMNS.map((column) => (
                      <TableCell key={column}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : amenities.length > 0 ? (
                amenities.map((amenity) => (
                  <AmenityRow key={amenity.id} amenity={amenity} onEdit={() => setEditing(amenity)} onToggle={() => toggleActive(amenity)} />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-muted-foreground">
                    No amenities found. Add amenities to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* A new key per opening starts each form from its amenity's values. */}
      {createOpen && <AmenityForm key="new" mode="dialog" open onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />}
      {editing && (
        <AmenityForm key={editing.id} mode="dialog" open amenity={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />
      )}
    </>
  );
}
