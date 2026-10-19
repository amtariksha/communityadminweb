'use client';

import { useState, type ReactNode } from 'react';
import {
  FileText,
  File,
  Image,
  FolderOpen,
  AlertTriangle,
  Download,
  Eye,
  Grid,
  List,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useDocumentCategories,
  useDocuments,
  useExpiringDocuments,
  useDeleteDocument,
  fetchPresignedDownloadUrl,
} from '@/hooks';
import type { Document as SocietyDocument } from '@communityos/shared';
import { useUnitChoices } from '../helpdesk/new/use-unit-choices';
import { UploadDocumentDialog } from './upload-document-dialog';
import { CreateCategoryDialog } from './create-category-dialog';
import { DocumentEditForm } from './edit/document-edit-form';
import { canWriteDocuments } from './files/file-actions';

type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE = 20;
const EXPIRY_WINDOW_DAYS = 30;

function getFileIcon(fileType: string): ReactNode {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-destructive" />;
    case 'doc':
    case 'docx':
      return <File className="h-5 w-5 text-primary" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'image':
      return <Image className="h-5 w-5 text-success" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

/**
 * Derive a short file-type string (pdf, docx, jpg, …) from the stored
 * document row. The API returns `file_name` + `mime_type` but not a
 * discrete `file_type` field, and referencing `doc.file_type` directly
 * crashed the page with "Cannot read properties of undefined (reading
 * 'toUpperCase')". Prefer the extension on the file name, fall back
 * to the MIME subtype, then 'file' as a last resort.
 */
function getFileType(doc: SocietyDocument): string {
  const name = doc.file_name ?? '';
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase();
  }
  const mime = doc.mime_type ?? '';
  if (mime.includes('/')) {
    return mime.split('/')[1]?.toLowerCase() ?? 'file';
  }
  return 'file';
}

/** "Expires today / in N days" for a document inside the expiry window, else Active. */
function ExpiryBadge({ daysLeft }: { daysLeft: number | undefined }): ReactNode {
  if (daysLeft === undefined) {
    return <Badge variant="success">Active</Badge>;
  }
  const label = daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  return <Badge variant="warning">{label}</Badge>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-48" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function DocumentsContent(): ReactNode {
  const { addToast } = useToast();
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  // FILE-11: Edit File as a dialog in the standard layout.
  const [editingId, setEditingId] = useState<string | null>(null);


  const categoriesQuery = useDocumentCategories();
  // Every unit, read 100 at a time (GET /units refuses a larger page).
  const unitsQuery = useUnitChoices();
  const units = unitsQuery.data ?? [];
  const [filterFolderType, setFilterFolderType] = useState<string>('all');
  const [filterUnitId, setFilterUnitId] = useState<string>('all');

  const documentsQuery = useDocuments({
    category_id: activeCategoryId || undefined,
    folder_type: filterFolderType !== 'all' ? filterFolderType : undefined,
    unit_id: filterUnitId !== 'all' ? filterUnitId : undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const expiringQuery = useExpiringDocuments(EXPIRY_WINDOW_DAYS);
  const deleteDocument = useDeleteDocument();

  const categories = categoriesQuery.data ?? [];
  const allDocuments = documentsQuery.data?.data ?? [];
  // Derive expiring set FIRST — the `documents` filter below depends on it.
  // Previously these were declared after the filter, which threw a
  // ReferenceError (TDZ) on every render and crashed the page.
  const expiringDocs = expiringQuery.data ?? [];
  const daysLeftById = new Map(expiringDocs.map((d) => [d.id, d.days_left]));
  const expiringCount = expiringDocs.length;
  // Expiring Soon lists what the API says expires within the window, not
  // just the expiring rows of the page on screen.
  const documents: SocietyDocument[] = showExpiringOnly ? expiringDocs : allDocuments;
  const listLoading = showExpiringOnly ? expiringQuery.isLoading : documentsQuery.isLoading;
  const totalDocuments = showExpiringOnly ? documents.length : (documentsQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalDocuments / ITEMS_PER_PAGE));

  function handleDeleteDocument(docId: string): void {
    deleteDocument.mutate(docId, {
      onSuccess() {
        addToast({ title: 'Document deleted', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to delete document', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  /**
   * QA #258 — view button used to call window.open(file_url) which
   * served whatever Content-Disposition the stored object had —
   * which on E2E uploads is `attachment`, so the browser downloaded
   * instead of rendering. Now we ask the API for a presigned GET
   * signed with `ResponseContentDisposition: inline` and open that.
   */
  async function handleViewDocument(doc: SocietyDocument): Promise<void> {
    try {
      const url = await fetchPresignedDownloadUrl({
        fileUrl: doc.file_url,
        disposition: 'inline',
        fileName: doc.file_name,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      addToast({
        title: 'Could not open document',
        description: friendlyError(err),
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      {editingId && (
        <DocumentEditForm
          mode="dialog"
          open
          documentId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => setEditingId(null)}
        />
      )}
      <PageHeader
        breadcrumbs={[{ label: 'Documents' }]}
        title="Documents"
        description="Document vault — store society documents with categorization and expiry tracking"
        actions={
          <>
            <CreateCategoryDialog />

            <UploadDocumentDialog categories={categories} units={units} />
          </>
        }
      />

      {expiringCount > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-medium text-warning">
                {expiringCount} document{expiringCount > 1 ? 's' : ''} expiring within 30 days
              </p>
              <p className="text-xs text-muted-foreground">Review and renew as needed</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Folder Type Tabs */}
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                {(['all', 'common', 'unit', 'committee'] as const).map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => {
                      setFilterFolderType(ft);
                      setPage(1);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      filterFolderType === ft
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                    }`}
                  >
                    {ft === 'all' ? 'All Folders' : ft === 'unit' ? 'Flat-wise / Unit' : `${ft} Docs`}
                  </button>
                ))}
              </div>

              {(filterFolderType === 'unit' || filterFolderType === 'all') && (
                <Select
                  value={filterUnitId}
                  onChange={(e) => {
                    setFilterUnitId(e.target.value);
                    setPage(1);
                  }}
                  className="w-44 text-xs"
                >
                  <option value="all">All Units / Flats</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number}
                    </option>
                  ))}
                </Select>
              )}

              <Select
                value={activeCategoryId}
                onChange={(e) => {
                  setActiveCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-44 text-xs"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
              <Button
                variant={showExpiringOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowExpiringOnly(!showExpiringOnly);
                  setPage(1);
                }}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {showExpiringOnly ? 'Showing Expiring' : 'Expiring Soon'}
                {expiringCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{expiringCount}</Badge>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between">
            <div className="flex gap-1 overflow-x-auto border-b">
              <button
                type="button"
                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategoryId === ''
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setActiveCategoryId('');
                  setPage(1);
                }}
              >
                All
              </button>
              {categoriesQuery.isLoading ? (
                <>
                  <Skeleton className="mx-1 h-8 w-20" />
                  <Skeleton className="mx-1 h-8 w-20" />
                  <Skeleton className="mx-1 h-8 w-20" />
                </>
              ) : (
                categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                      activeCategoryId === cat.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      setPage(1);
                    }}
                  >
                    {cat.name}
                  </button>
                ))
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </div>

          {viewMode === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listLoading ? (
                  <TableSkeleton />
                ) : (
                  documents.map((doc) => {
                    const fileType = getFileType(doc);
                    return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(fileType)}
                          <div>
                            <span className="font-medium">{doc.title}</span>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{fileType.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell>
                        <ExpiryBadge daysLeft={daysLeftById.get(doc.id)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = doc.file_url;
                              link.download = doc.title;
                              link.target = '_blank';
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWriteDocuments() && (
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditingId(doc.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={
                              deleteDocument.isPending &&
                              deleteDocument.variables === doc.id
                            }
                          >
                            {deleteDocument.isPending &&
                            deleteDocument.variables === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ) : (
            <>
              {listLoading ? (
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
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {documents.map((doc) => {
                    const fileType = getFileType(doc);
                    return (
                    <Card key={doc.id} className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          {getFileIcon(fileType)}
                          <div className="flex gap-1">
                            {daysLeftById.has(doc.id) && (
                              <ExpiryBadge daysLeft={daysLeftById.get(doc.id)} />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {fileType.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <h3 className="mb-1 line-clamp-2 text-sm font-medium">{doc.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)} &middot; {formatDate(doc.created_at)}
                        </p>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!listLoading && documents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm text-muted-foreground">
                Upload documents or change the category filter
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({totalDocuments} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
