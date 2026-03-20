'use client';

import { useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { useToast } from '@/components/ui/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCsvImportUnits } from '@/hooks';
import type { CsvImportRow } from '@/hooks';
import {
  TEMPLATES,
  mapRowToImport,
  type ImportSource,
  type TemplateInfo,
} from './template-mappings';

type Step = 'select-template' | 'upload' | 'preview' | 'result';

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  // Simple CSV parser that handles quoted fields
  function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? '';
    });
    return obj;
  });

  return { headers, rows };
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateInfo;
  selected: boolean;
  onSelect: () => void;
}): ReactNode {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{template.description}</p>
        {template.sampleColumns.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.sampleColumns.slice(0, 8).map((col) => (
              <Badge key={col} variant="secondary" className="text-xs">
                {col}
              </Badge>
            ))}
            {template.sampleColumns.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{template.sampleColumns.length - 8} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ImportContent(): ReactNode {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvImport = useCsvImportUnits();

  const [step, setStep] = useState<Step>('select-template');
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mappedRows, setMappedRows] = useState<CsvImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{
    units_created: number;
    units_updated: number;
    members_created: number;
    errors: string[];
  } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file || !selectedSource) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = function onLoad(event) {
      const text = event.target?.result as string;
      const { headers, rows } = parseCsv(text);

      if (headers.length === 0 || rows.length === 0) {
        addToast({ title: 'CSV file is empty or invalid', variant: 'destructive' });
        return;
      }

      setRawHeaders(headers);
      setRawRows(rows);

      // Map rows using template
      const mapped: CsvImportRow[] = [];
      const skipped: number[] = [];

      rows.forEach((row, idx) => {
        const result = mapRowToImport(selectedSource, row);
        if (result && result.unit_number) {
          mapped.push(result);
        } else {
          skipped.push(idx + 2); // +2 for 1-indexed + header row
        }
      });

      if (skipped.length > 0) {
        addToast({
          title: `${skipped.length} rows skipped (missing unit number)`,
          variant: 'default',
        });
      }

      setMappedRows(mapped);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  function handleImport(): void {
    if (!selectedSource || mappedRows.length === 0) return;

    csvImport.mutate(
      { rows: mappedRows, source: selectedSource },
      {
        onSuccess(response) {
          const result = (response as { data: typeof importResult }).data;
          setImportResult(result);
          setStep('result');
          addToast({ title: 'Import completed!', variant: 'success' });
        },
        onError(error) {
          addToast({
            title: `Import failed: ${(error as Error).message}`,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function resetImport(): void {
    setStep('select-template');
    setSelectedSource(null);
    setRawHeaders([]);
    setRawRows([]);
    setMappedRows([]);
    setFileName('');
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Units"
        description="Import unit and resident data from other society management apps"
        actions={
          <Button variant="outline" onClick={() => router.push('/units')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Units
          </Button>
        }
      />

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant={step === 'select-template' ? 'default' : 'secondary'}>1. Choose Template</Badge>
        <ChevronRight className="h-4 w-4" />
        <Badge variant={step === 'upload' ? 'default' : 'secondary'}>2. Upload CSV</Badge>
        <ChevronRight className="h-4 w-4" />
        <Badge variant={step === 'preview' ? 'default' : 'secondary'}>3. Preview & Confirm</Badge>
        <ChevronRight className="h-4 w-4" />
        <Badge variant={step === 'result' ? 'default' : 'secondary'}>4. Result</Badge>
      </div>

      {/* Step 1: Select Template */}
      {step === 'select-template' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <Info className="mt-0.5 h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Choose the app you're migrating from. This helps us automatically map the CSV columns to the right fields. If your data is from a custom spreadsheet, select &quot;Custom CSV&quot;.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedSource === template.id}
                onSelect={() => setSelectedSource(template.id)}
              />
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              disabled={!selectedSource}
              onClick={() => setStep('upload')}
            >
              Next: Upload File
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Upload CSV */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload CSV File
              <Badge variant="outline" className="ml-2">{TEMPLATES.find((t) => t.id === selectedSource)?.name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedSource && selectedSource !== 'custom' && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="mb-2 text-sm font-medium">Expected columns:</p>
                  <div className="flex flex-wrap gap-1">
                    {TEMPLATES.find((t) => t.id === selectedSource)?.sampleColumns.map((col) => (
                      <Badge key={col} variant="secondary" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-primary/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-medium">Click to upload CSV file</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Supports .csv files. Excel files must be saved as CSV first.
                </p>
                {fileName && (
                  <Badge variant="outline" className="mt-3">{fileName}</Badge>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('select-template')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview Import — {mappedRows.length} units</CardTitle>
                <Badge variant="outline">{fileName}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{mappedRows.length}</p>
                  <p className="text-xs text-muted-foreground">Units to import</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">
                    {mappedRows.filter((r) => r.owner_name || r.owner_phone).length}
                  </p>
                  <p className="text-xs text-muted-foreground">With owner info</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">
                    {mappedRows.filter((r) => r.tenant_name || r.tenant_phone).length}
                  </p>
                  <p className="text-xs text-muted-foreground">With tenant info</p>
                </div>
              </div>

              <div className="max-h-96 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background">#</TableHead>
                      <TableHead className="sticky top-0 bg-background">Unit</TableHead>
                      <TableHead className="sticky top-0 bg-background">Block</TableHead>
                      <TableHead className="sticky top-0 bg-background">BHK</TableHead>
                      <TableHead className="sticky top-0 bg-background">Area (sqft)</TableHead>
                      <TableHead className="sticky top-0 bg-background">Maintenance</TableHead>
                      <TableHead className="sticky top-0 bg-background">Owner</TableHead>
                      <TableHead className="sticky top-0 bg-background">Tenant</TableHead>
                      <TableHead className="sticky top-0 bg-background">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedRows.slice(0, 50).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{row.unit_number}</TableCell>
                        <TableCell>{row.block ?? '-'}</TableCell>
                        <TableCell>{row.bhk_type ?? '-'}</TableCell>
                        <TableCell>{row.area_sqft?.toLocaleString() ?? '-'}</TableCell>
                        <TableCell>{row.maintenance_amount ? `₹${row.maintenance_amount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>
                          {row.owner_name ? (
                            <span title={row.owner_phone ?? ''}>{row.owner_name}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {row.tenant_name ? (
                            <span title={row.tenant_phone ?? ''}>{row.tenant_name}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {row.occupancy_status ? (
                            <Badge
                              variant={
                                row.occupancy_status === 'rented'
                                  ? 'default'
                                  : row.occupancy_status === 'self_occupied'
                                    ? 'success'
                                    : 'secondary'
                              }
                            >
                              {row.occupancy_status.replace('_', ' ')}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {mappedRows.length > 50 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Showing first 50 of {mappedRows.length} rows
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={csvImport.isPending || mappedRows.length === 0}
            >
              {csvImport.isPending ? 'Importing...' : `Import ${mappedRows.length} Units`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && importResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950/30">
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    {importResult.units_created}
                  </p>
                  <p className="text-sm text-green-600">Units Created</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                    {importResult.units_updated}
                  </p>
                  <p className="text-sm text-blue-600">Units Updated</p>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center dark:border-purple-900 dark:bg-purple-950/30">
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                    {importResult.members_created}
                  </p>
                  <p className="text-sm text-purple-600">Members Created</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      {importResult.errors.length} warnings
                    </p>
                  </div>
                  <ul className="max-h-40 overflow-auto space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={resetImport}>
              Import More
            </Button>
            <Button onClick={() => router.push('/units')}>
              Go to Units
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
