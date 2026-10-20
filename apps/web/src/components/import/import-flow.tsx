'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ImportCommitResult, ImportPreview, ImportTarget } from '@/hooks/use-imports';
import { ImportRowsTable, type ImportPreviewColumn } from './import-rows-table';
import { CommitSummary, PreviewSummary } from './import-summary';
import { useImportFlow, type ImportFlowState, type ImportStep } from './use-import-flow';

export interface ImportFlowProps {
  target: ImportTarget;
  title: string;
  description?: ReactNode;
  /** Sheet columns shown in the preview table. */
  columns: readonly ImportPreviewColumn[];
  /** The type's options (financial year, meter type…), sent with the file. */
  options?: Record<string, unknown>;
  /** Controls for the options, shown above the file picker. */
  children?: ReactNode;
  /** Label of the commit button, e.g. "Post" for accounting imports. */
  applyLabel?: string;
  /** False when the user's role may not run this import. */
  allowed?: boolean;
  onApplied?: (result: ImportCommitResult) => void;
}

/**
 * SB-13 import, the same on every screen: 1. download the template,
 * 2. pick the filled file and Preview (every row checked, errors shown per
 * row, nothing saved), 3. commit — which the API checks again and applies
 * in one go — then the result. A screen whose API is not deployed yet says
 * so instead of failing.
 */
export function ImportFlow({ target, title, description, columns, options, children, applyLabel = 'Import', allowed = true, onApplied }: ImportFlowProps): ReactNode {
  const flow = useImportFlow(target, options, onApplied);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {flow.step.kind === 'unavailable' ? (
          <p className="text-sm text-muted-foreground">This upload is not available yet. It opens once the server is updated.</p>
        ) : (
          <>
            {description && <div className="text-sm text-muted-foreground">{description}</div>}
            {!allowed && <p className="text-sm text-muted-foreground">Your role cannot run this upload.</p>}
            <ImportSteps flow={flow} title={title} allowed={allowed}>
              {children}
            </ImportSteps>
            <ImportStepView step={flow.step} columns={columns} applyLabel={applyLabel} disabled={!allowed || flow.busy} onApply={(preview) => void flow.runApply(preview)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ImportSteps({ flow, title, allowed, children }: { flow: ImportFlowState; title: string; allowed: boolean; children?: ReactNode }): ReactNode {
  return (
    <ol className="list-decimal space-y-3 pl-5 text-sm">
      <li>
        <span className="mr-2">Download the template and fill one row per record.</span>
        <Button type="button" size="sm" variant="outline" onClick={() => void flow.template('xlsx')}>
          Excel template
        </Button>{' '}
        <Button type="button" size="sm" variant="ghost" onClick={() => void flow.template('csv')}>
          CSV template
        </Button>
      </li>
      <li className="space-y-2">
        <span>Choose the filled file (.xlsx or .csv, up to 4.5 MB) and preview it. Nothing is saved by a preview.</span>
        {children}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={flow.inputRef}
            type="file"
            aria-label={`${title}: file`}
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            disabled={!allowed || flow.busy}
            onChange={(event) => flow.pick(event.target.files?.[0] ?? null)}
          />
          <Button type="button" size="sm" disabled={!allowed || !flow.file || flow.busy} onClick={() => void flow.runPreview()}>
            {flow.previewing ? 'Reading…' : 'Preview'}
          </Button>
        </div>
      </li>
    </ol>
  );
}

export interface StepViewProps {
  step: ImportStep;
  columns: readonly ImportPreviewColumn[];
  applyLabel: string;
  disabled: boolean;
  onApply: (preview: ImportPreview) => void;
}

/** What follows a preview: the rows and the commit button, the refused rows, or the result. */
export function ImportStepView({ step, columns, applyLabel, disabled, onApply }: StepViewProps): ReactNode {
  if (step.kind === 'applied') return <CommitSummary result={step.result} />;
  if (step.kind === 'refused') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive" role="alert">
          {step.message}
        </p>
        <ImportRowsTable rows={step.rows} columns={columns} label="Rows with errors" />
      </div>
    );
  }
  if (step.kind !== 'previewed') return null;
  const { preview } = step;
  return (
    <div className="space-y-3">
      <PreviewSummary preview={preview} />
      <ImportRowsTable rows={preview.rows} columns={columns} label="Preview" />
      <Button type="button" disabled={disabled || !preview.can_apply} onClick={() => onApply(preview)}>
        {`${applyLabel} ${preview.valid_rows} ${preview.valid_rows === 1 ? 'row' : 'rows'}`}
      </Button>
    </div>
  );
}
