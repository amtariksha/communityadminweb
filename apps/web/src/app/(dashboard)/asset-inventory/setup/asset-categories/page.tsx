import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ASSET_TYPES } from '../../../assets/asset-ui';

// Asset & Inventory › Setup › Setup Asset Categories (ASSET-S1). Until
// ASSET-16 the society's categories are today's fixed list, read only.
export default function Page(): ReactNode {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold">Set up Asset Categories</h3>
        <p className="text-sm text-muted-foreground">Categories become editable in a later release.</p>
        <Table aria-label="Asset categories">
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">S.No</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ASSET_TYPES.map((type, index) => (
              <TableRow key={type.value}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{type.label}</TableCell>
                <TableCell>Yes</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
