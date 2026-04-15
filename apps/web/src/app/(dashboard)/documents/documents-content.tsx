'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Upload,
  FileText,
  File,
  Image,
  FolderOpen,
  AlertTriangle,
  Download,
  Eye,
  Grid,
  List,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PageHeader } from '@/components/layout/page-header';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useDocumentCategories,
  useDocuments,
  useExpiringDocuments,
  useUploadDocument,
  useCreateCategory,
  useDeleteDocument,
} from '@/hooks';
import type { DocumentCategory, Document as SocietyDocument } from '@communityos/shared';

type ViewMode = 'grid' | 'list';

const ITEMS_PER_PAGE = 20;

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

function isExpiringSoon(doc: SocietyDocument, expiringIds: Set<string>): boolean {
  return expiringIds.has(doc.id);
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

  // Upload dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategoryId, setUploadCategoryId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFileType, setUploadFileType] = useState('pdf');
  const [uploadFileSize, setUploadFileSize] = useState('');

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const categoriesQuery = useDocumentCategories();
  const documentsQuery = useDocuments({
    category_id: activeCategoryId || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const expiringQuery = useExpiringDocuments(30);
  const uploadDocument = useUploadDocument();
  const createCategory = useCreateCategory();
  const deleteDocument = useDeleteDocument();

  const categories = categoriesQuery.data ?? [];
  const allDocuments = documentsQuery.data?.data ?? [];
  const documents = showExpiringOnly
    ? allDocuments.filter((doc) => expiringIds.has(doc.id))
    : allDocuments;
  const totalDocuments = showExpiringOnly ? documents.length : (documentsQuery.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalDocuments / ITEMS_PER_PAGE));
  const expiringDocs = expiringQuery.data ?? [];
  const expiringIds = new Set(expiringDocs.map((d) => d.id));
  const expiredCount = expiringDocs.filter(() => false).length; // API returns expiring, not expired
  const expiringCount = expiringDocs.length;

  function resetUploadForm(): void {
    setUploadTitle('');
    setUploadCategoryId('');
    setUploadDescription('');
    setUploadFileUrl('');
    setUploadFileType('pdf');
    setUploadFileSize('');
  }

  function handleUploadDocument(e: FormEvent): void {
    e.preventDefault();
    uploadDocument.mutate(
      {
        category_id: uploadCategoryId,
        title: uploadTitle,
        description: uploadDescription || null,
        file_url: uploadFileUrl,
        file_name: uploadTitle.trim() || 'document',
        mime_type: uploadFileType === 'pdf' ? 'application/pdf' : `application/${uploadFileType}`,
        file_size: Number(uploadFileSize) || 0,
      },
      {
        onSuccess() {
          setUploadDialogOpen(false);
          resetUploadForm();
          addToast({ title: 'Document uploaded successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to upload document', variant: 'destructive' });
        },
      },
    );
  }

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
        onError() {
          addToast({ title: 'Failed to create category', variant: 'destructive' });
        },
      },
    );
  }

  function handleDeleteDocument(docId: string): void {
    deleteDocument.mutate(docId, {
      onSuccess() {
        addToast({ title: 'Document deleted', variant: 'success' });
      },
      onError() {
        addToast({ title: 'Failed to delete document', variant: 'destructive' });
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Documents' }]}
        title="Documents"
        description="Document vault — store society documents with categorization and expiry tracking"
        actions={
          <>
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

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleUploadDocument}>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Add a new document to the repository</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="upload-title">Title</Label>
                      <Input
                        id="upload-title"
                        placeholder="Document title"
                        required
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upload-category">Category</Label>
                      <Select
                        id="upload-category"
                        required
                        value={uploadCategoryId}
                        onChange={(e) => setUploadCategoryId(e.target.value)}
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upload-description">Description</Label>
                      <Input
                        id="upload-description"
                        placeholder="Optional description"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="upload-file-url">File URL</Label>
                      <Input
                        id="upload-file-url"
                        placeholder="https://storage.example.com/file.pdf"
                        required
                        value={uploadFileUrl}
                        onChange={(e) => setUploadFileUrl(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="upload-file-type">File Type</Label>
                        <Select
                          id="upload-file-type"
                          value={uploadFileType}
                          onChange={(e) => setUploadFileType(e.target.value)}
                        >
                          <option value="pdf">PDF</option>
                          <option value="doc">DOC</option>
                          <option value="docx">DOCX</option>
                          <option value="jpg">JPG</option>
                          <option value="png">PNG</option>
                          <option value="other">Other</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="upload-file-size">File Size (bytes)</Label>
                        <Input
                          id="upload-file-size"
                          type="number"
                          placeholder="e.g., 2048000"
                          value={uploadFileSize}
                          onChange={(e) => setUploadFileSize(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={uploadDocument.isPending}>
                      {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
            <div className="flex items-center gap-3">
              <Select
                value={activeCategoryId}
                onChange={(e) => {
                  setActiveCategoryId(e.target.value);
                  setPage(1);
                }}
                className="w-48"
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
                {documentsQuery.isLoading ? (
                  <TableSkeleton />
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.file_type)}
                          <div>
                            <span className="font-medium">{doc.title}</span>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.file_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell>
                        {isExpiringSoon(doc, expiringIds) ? (
                          <Badge variant="warning">Expiring Soon</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
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
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deleteDocument.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <>
              {documentsQuery.isLoading ? (
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
                  {documents.map((doc) => (
                    <Card key={doc.id} className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          {getFileIcon(doc.file_type)}
                          <div className="flex gap-1">
                            {isExpiringSoon(doc, expiringIds) && (
                              <Badge variant="warning" className="text-xs">Expiring</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {doc.file_type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <h3 className="mb-1 line-clamp-2 text-sm font-medium">{doc.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)} &middot; {formatDate(doc.created_at)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {!documentsQuery.isLoading && documents.length === 0 && (
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
