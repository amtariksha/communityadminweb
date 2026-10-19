'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import type { Document as SocietyDocument } from '@communityos/shared';
import { ExpiryBadge, formatFileSize, getFileIcon, getFileType, uploaderName } from './document-file-type';

interface DocumentsGridProps {
  documents: readonly SocietyDocument[];
  loading: boolean;
  daysLeftById: ReadonlyMap<string, number>;
}

function GridSkeleton(): ReactNode {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="mb-3 h-5 w-5" />
            <Skeleton className="mb-1 h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** The standard Documents page's grid view. */
export function DocumentsGrid({ documents, loading, daysLeftById }: DocumentsGridProps): ReactNode {
  if (loading) return <GridSkeleton />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {documents.map((doc) => {
        const fileType = getFileType(doc);
        return (
          <Card key={doc.id} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="mb-3 flex items-start justify-between">
                {getFileIcon(fileType)}
                <div className="flex gap-1">
                  {daysLeftById.has(doc.id) && <ExpiryBadge daysLeft={daysLeftById.get(doc.id)} />}
                  <Badge variant="outline" className="text-xs">
                    {fileType.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <h3 className="mb-1 line-clamp-2 text-sm font-medium">{doc.title}</h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(doc.file_size)} &middot; {formatDate(doc.created_at)} &middot; {uploaderName(doc)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
