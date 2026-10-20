'use client';

import { useState, type ReactNode } from 'react';
import {
  FolderOpen,
  AlertTriangle,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useDocumentCategories,
  useDocuments,
  useExpiringDocuments,
  useDeleteDocument,
} from '@/hooks';
import { useOpenStoredFile } from '@/hooks/use-stored-file';
import type { Document as SocietyDocument } from '@communityos/shared';
import { useUnitChoices } from '../helpdesk/new/use-unit-choices';
import { UploadDocumentDialog } from './upload-document-dialog';
import { CreateCategoryDialog } from './create-category-dialog';
import { DocumentEditForm } from './edit/document-edit-form';
import { DocumentsGrid } from './standard/documents-grid';
import { DocumentsTable } from './standard/documents-table';

type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE = 20;
const EXPIRY_WINDOW_DAYS = 30;

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
  // FILE-21: the API's search (title, description, file name), typed and debounced.
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim(), 300);

  const documentsQuery = useDocuments({
    category_id: activeCategoryId || undefined,
    folder_type: filterFolderType !== 'all' ? filterFolderType : undefined,
    unit_id: filterUnitId !== 'all' ? filterUnitId : undefined,
    search: search || undefined,
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

  // QA #258 — opened through a link signed `inline`, so PDFs and pictures
  // render in the browser instead of downloading.
  const openFile = useOpenStoredFile();
  async function handleViewDocument(doc: SocietyDocument): Promise<void> {
    await openFile(doc.file_url, { disposition: 'inline', fileName: doc.file_name });
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
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search documents"
                  placeholder="Search documents"
                  className="pl-8 text-xs"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
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
            <DocumentsTable
              documents={documents}
              loading={listLoading}
              daysLeftById={daysLeftById}
              onView={(doc) => void handleViewDocument(doc)}
              onEdit={setEditingId}
              onDelete={handleDeleteDocument}
              deletingId={deleteDocument.isPending ? (deleteDocument.variables as string | undefined) : undefined}
            />
          ) : (
            <DocumentsGrid documents={documents} loading={listLoading} daysLeftById={daysLeftById} />
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
