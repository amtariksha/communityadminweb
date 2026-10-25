'use client';

import { useState, useEffect, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { financialDateBounds } from '@/lib/utils';
import {
  useTallyXmlImport,
  useTallyXmlUpload,
  useTallyCsvImport,
  useTallyCommitImport,
  useTallyActiveJobs,
  useTallyImportHistory,
  useUnits,
  UNIT_PICKER_LIMIT,
} from '@/hooks';
import {
  useTallyEnqueueCommit,
  useTallyCommitJob,
  useParseImportDebtors,
} from '@/hooks/use-tally-import';
import type {
  TallyImportParseResult,
  TallyCommitResult,
  TallyDebtorParseResult,
  TallyDebtorLinkInput,
} from '@/hooks/use-tally-import';
import {
  DebtorReviewTable,
  buildInitialDecisions,
  validateDecision,
  type DebtorDecisionMap,
} from '@/components/tally/debtor-review-table';
import { TallyCsvLedgerField, csvLedgerOption } from './tally-csv-ledger-field';

interface TallyImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Import from Tally (moved out of accounts-content.tsx, GL-12): parse an
 * XML or CSV export, review sundry debtors, then commit in the background
 * and follow the job. The form starts blank each time the dialog opens.
 */
export function TallyImportDialog({ open, onOpenChange }: TallyImportDialogProps): ReactNode {
  const { addToast } = useToast();
  const dateBounds = financialDateBounds();
  const tallyDialogOpen = open;
  const setTallyDialogOpen = onOpenChange;
  const tallyXmlImport = useTallyXmlImport();
  const tallyXmlUpload = useTallyXmlUpload();
  const tallyCsvImport = useTallyCsvImport();
  const tallyCommitImport = useTallyCommitImport();
  // Phase 2 — async commit + polling. Both are wired even though
  // the dialog only uses the async path now; the legacy synchronous
  // hook stays for any future caller that wants inline results.
  // (The polling hook is declared below the tallyJobId state so its
  // arg can reference it.)
  const tallyEnqueueCommit = useTallyEnqueueCommit();
  // FeatPlan — sundry-debtor parse + commit-with-links. The
  // commit-with-links path reuses tallyCommitImport (sync) since
  // the BullMQ job row's selection_json doesn't carry debtor_links.
  const parseImportDebtors = useParseImportDebtors();
  // Driver list for the "Pick existing unit" autocomplete on the
  // review table (the whole list, up to the API's 1,000-row lookup cap).
  const unitsQuery = useUnits({ limit: UNIT_PICKER_LIMIT });

  // -- Tally import state --
  const [tallyFormat, setTallyFormat] = useState<'xml' | 'csv'>('xml');
  const [tallyContent, setTallyContent] = useState('');
  const [tallyCsvType, setTallyCsvType] = useState<'trial_balance' | 'day_book' | 'ledger_report' | 'receipt_register' | 'payment_register'>('trial_balance');
  const [tallyLedgerName, setTallyLedgerName] = useState('');
  // Parse response (import_id + records_parsed) — shown on the
  // preview step so the admin can review before committing.
  const [tallyParseResult, setTallyParseResult] =
    useState<TallyImportParseResult | null>(null);
  // Commit response (records_imported / skipped / errors) — shown on
  // the done step. Tracked separately so the preview step doesn't try
  // to render fields that don't exist until the commit fires.
  const [tallyCommitResult, setTallyCommitResult] =
    useState<TallyCommitResult | null>(null);
  const [tallyStep, setTallyStep] = useState<
    'input' | 'preview' | 'review-debtors' | 'running' | 'done'
  >('input');
  // FeatPlan — review-debtors step state. Populated when admin
  // clicks Import on a preview that contains sundry-debtor ledgers.
  // The parser runs server-side; results land here, decisions live
  // in tallyDebtorDecisions, and Confirm fires the sync /commit
  // path with debtor_links.
  const [tallyDebtorRows, setTallyDebtorRows] = useState<
    TallyDebtorParseResult[]
  >([]);
  const [tallyDebtorDecisions, setTallyDebtorDecisions] =
    useState<DebtorDecisionMap>({});
  // Phase 2 — async commit. When the operator clicks Import, we
  // enqueue a BullMQ job server-side and stash the job_id here.
  // The polling hook (useTallyCommitJob) takes over from there:
  // every 3s it fetches status + progress, and when status settles
  // (done | failed) we transition to the done step with the result.
  const [tallyJobId, setTallyJobId] = useState('');
  const tallyJobQuery = useTallyCommitJob(tallyJobId, tallyJobId !== '');
  // Active jobs strip — polls only while the dialog is open so we
  // don't run a 3s interval against the API forever just because
  // someone left the tab open on /accounts.
  const tallyActiveJobsQuery = useTallyActiveJobs(tallyDialogOpen);
  // Recent completed imports — drives the "Recent imports" history
  // strip in the dialog so the operator can see runs that finished
  // outside the active-jobs 60s window. Gated on dialog-open so a
  // closed /accounts tab makes zero /history calls; the hook
  // auto-polls (with backoff) while any row is still in-flight.
  const tallyHistoryQuery = useTallyImportHistory(tallyDialogOpen);

  // Per-type commit selection (Phase 1 of the import revamp). Each
  // entity type has two flags — include_new and include_changed —
  // that the operator toggles via checkboxes on the preview step.
  // The whole "type bucket" is omitted from the commit body when its
  // master checkbox is off, which tells the server "skip this type
  // entirely" (vs. "commit but only the new ones").
  const [tallyCommitGroups, setTallyCommitGroups] = useState(true);
  const [tallyCommitGroupsChanged, setTallyCommitGroupsChanged] = useState(true);
  const [tallyCommitLedgers, setTallyCommitLedgers] = useState(true);
  const [tallyCommitLedgersChanged, setTallyCommitLedgersChanged] = useState(true);
  const [tallyCommitVouchers, setTallyCommitVouchers] = useState(true);
  const [tallyCommitVouchersChanged, setTallyCommitVouchersChanged] = useState(true);
  // Phase 2 — cost centres + voucher type definitions.
  const [tallyCommitCostCentres, setTallyCommitCostCentres] = useState(true);
  const [tallyCommitCostCentresChanged, setTallyCommitCostCentresChanged] = useState(true);
  const [tallyCommitVoucherTypes, setTallyCommitVoucherTypes] = useState(true);
  const [tallyCommitVoucherTypesChanged, setTallyCommitVoucherTypesChanged] = useState(true);
  // Force flag — bypasses the file-hash dedupe ("imported same file
  // 2h ago"). Per-voucher hash + edited-locally guards still apply.
  const [tallyForceCommit, setTallyForceCommit] = useState(false);

  function resetTallyForm(): void {
    setTallyContent('');
    setTallyCsvType('trial_balance');
    setTallyLedgerName('');
    setTallyParseResult(null);
    setTallyCommitResult(null);
    setTallyStep('input');
    setTallyFormat('xml');
    setTallyCommitGroups(true);
    setTallyCommitGroupsChanged(true);
    setTallyCommitLedgers(true);
    setTallyCommitLedgersChanged(true);
    setTallyCommitVouchers(true);
    setTallyCommitVouchersChanged(true);
    setTallyCommitCostCentres(true);
    setTallyCommitCostCentresChanged(true);
    setTallyCommitVoucherTypes(true);
    setTallyCommitVoucherTypesChanged(true);
    setTallyForceCommit(false);
    setTallyJobId('');
    setTallyDebtorRows([]);
    setTallyDebtorDecisions({});
  }

  /**
   * Upload an XML file directly via multipart/form-data instead of
   * pasting it into the textarea. Saves the JSON-encoding round-trip
   * (which roughly doubles peak memory on a 30 MB XML) and supports
   * up to the server's 100 MB FileInterceptor cap. Mirrors the same
   * onSuccess flow as handleTallyParse — the parse response shape
   * is identical.
   */
  function handleTallyFileSelect(file: File | null): void {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      addToast({
        title: 'File too large',
        description: 'Max 100 MB. Split the export and import in two passes.',
        variant: 'destructive',
      });
      return;
    }
    // Clear the textarea so the operator can't accidentally trigger
    // the paste-Parse path on top of an in-flight upload — the
    // server uses one preview row per upload and we'd race ourselves.
    setTallyContent('');
    tallyXmlUpload.mutate(file, {
      onSuccess(data) {
        const parsed = data.data;
        setTallyParseResult(parsed);
        setTallyCommitResult(null);
        const c = parsed.counts;
        if (c) {
          setTallyCommitGroups(c.groups > 0);
          setTallyCommitLedgers(c.ledgers > 0);
          setTallyCommitVouchers(c.vouchers > 0);
          setTallyCommitCostCentres((c.costCentres ?? 0) > 0);
          setTallyCommitVoucherTypes((c.voucherTypes ?? 0) > 0);
        }
        setTallyCommitGroupsChanged(true);
        setTallyCommitLedgersChanged(true);
        setTallyCommitVouchersChanged(true);
        setTallyCommitCostCentresChanged(true);
        setTallyCommitVoucherTypesChanged(true);
        // FeatPlan — auto-tick Force when this file was already
        // committed recently. See handleTallyParse for rationale.
        setTallyForceCommit(parsed.duplicate_of != null);
        setTallyStep('preview');
        addToast({
          title: parsed.duplicate_of
            ? 'Parsed — same file imported recently (Force pre-ticked)'
            : `Tally XML uploaded (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
          variant: 'success',
        });
      },
      onError(error) {
        addToast({
          title: 'Upload failed',
          description: friendlyError(error),
          variant: 'destructive',
        });
      },
    });
  }

  function handleTallyParse(): void {
    if (!tallyContent.trim()) {
      addToast({ title: 'Paste content to import', variant: 'destructive' });
      return;
    }

    if (tallyFormat === 'xml') {
      tallyXmlImport.mutate(
        { xml_content: tallyContent, import_type: 'all' },
        {
          onSuccess(data) {
            const parsed = data.data;
            setTallyParseResult(parsed);
            setTallyCommitResult(null);
            // Default the per-type checkboxes from the parser's
            // counts: tick a type only if there's something to
            // commit. Operator can untick to skip.
            const c = parsed.counts;
            if (c) {
              setTallyCommitGroups(c.groups > 0);
              setTallyCommitLedgers(c.ledgers > 0);
              setTallyCommitVouchers(c.vouchers > 0);
              setTallyCommitCostCentres((c.costCentres ?? 0) > 0);
              setTallyCommitVoucherTypes((c.voucherTypes ?? 0) > 0);
            }
            // Pre-tick "include changed" by default — re-imports
            // typically want the latest Tally state to win unless
            // the operator explicitly says "only new".
            setTallyCommitGroupsChanged(true);
            setTallyCommitLedgersChanged(true);
            setTallyCommitVouchersChanged(true);
            setTallyCommitCostCentresChanged(true);
            setTallyCommitVoucherTypesChanged(true);
            // FeatPlan — when the server flagged a duplicate (the
            // common "I closed the dialog mid-run, now I'm
            // re-importing" path), pre-tick Force so the admin
            // can submit immediately. Pre-fix the operator had to
            // hunt for the small Force checkbox at the bottom of
            // the preview pane and missed it. Audit trail still
            // preserved server-side via per-voucher hash.
            setTallyForceCommit(parsed.duplicate_of != null);
            setTallyStep('preview');
            addToast({
              title: parsed.duplicate_of
                ? 'Parsed — same file imported recently (Force pre-ticked)'
                : 'Tally XML parsed successfully',
              variant: 'success',
            });
          },
          onError(error) {
            addToast({ title: 'Failed to parse Tally XML', description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    } else {
      tallyCsvImport.mutate(
        { csv_content: tallyContent, import_type: tallyCsvType, ...csvLedgerOption(tallyCsvType, tallyLedgerName) },
        {
          onSuccess(data) {
            setTallyParseResult(data.data);
            setTallyCommitResult(null);
            setTallyStep('preview');
            addToast({ title: 'Tally CSV parsed successfully', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to parse Tally CSV', description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    }
  }

  /**
   * Commit the parsed import — writes the staged records to the DB.
   * Called from the Commit button on the preview step. The preview
   * step is a dry-run; nothing actually changes until this fires.
   */
  async function handleTallyCommit(): Promise<void> {
    if (!tallyParseResult?.import_id) {
      addToast({
        title: 'Nothing to commit',
        description: 'Parse a file first.',
        variant: 'destructive',
      });
      return;
    }
    // Build the per-type selection from the checkboxes. Omit a type
    // entirely when its master checkbox is unticked — that tells
    // the server "skip this type". Including with both flags false
    // would be a no-op anyway, but omitting is clearer in logs.
    const commit: NonNullable<Parameters<typeof tallyCommitImport.mutate>[0]['commit']> = {};
    if (tallyCommitGroups) {
      commit.groups = {
        include_new: true,
        include_changed: tallyCommitGroupsChanged,
      };
    }
    if (tallyCommitLedgers) {
      commit.ledgers = {
        include_new: true,
        include_changed: tallyCommitLedgersChanged,
      };
    }
    if (tallyCommitVouchers) {
      commit.vouchers = {
        include_new: true,
        include_changed: tallyCommitVouchersChanged,
      };
    }
    if (tallyCommitCostCentres) {
      commit.cost_centres = {
        include_new: true,
        include_changed: tallyCommitCostCentresChanged,
      };
    }
    if (tallyCommitVoucherTypes) {
      commit.voucher_types = {
        include_new: true,
        include_changed: tallyCommitVoucherTypesChanged,
      };
    }
    if (Object.keys(commit).length === 0) {
      addToast({
        title: 'Pick at least one type to import',
        description: 'Tick the checkbox next to Groups, Ledgers, or Vouchers.',
        variant: 'destructive',
      });
      return;
    }

    // FeatPlan — when ledgers are being committed, run the AI
    // sundry-debtor parser and route to the Review Debtors step
    // when any debtor rows are detected. The strict-gate decision
    // baked into the plan: every sundry-debtor row needs an
    // explicit Approve+Link or Skip before the masters commit.
    // Skip the parser entirely when ledgers are unticked (no
    // debtor rows can land) — saves a Gemini round-trip.
    if (tallyCommitLedgers && tallyParseResult.import_id) {
      try {
        const debtors = await parseImportDebtors.mutateAsync({
          import_id: tallyParseResult.import_id,
        });
        if (debtors.length > 0) {
          setTallyDebtorRows(debtors);
          setTallyDebtorDecisions(buildInitialDecisions(debtors));
          setTallyStep('review-debtors');
          return;
        }
      } catch (err) {
        // Defensive — if Gemini / parser fails, fall through to
        // the legacy commit path so the operator's import isn't
        // blocked. The toast tells them what happened.
        addToast({
          title: 'Could not auto-parse debtor names',
          description:
            'Continuing with a regular masters import. You can use the Reconcile Debtors page to link them later. ' +
            (err as Error).message,
          variant: 'default',
        });
      }
    }

    // Default path — masters-only commit via async (BullMQ).
    fireMastersCommit(commit, undefined);
  }

  /**
   * Fire the masters commit in async mode. Used by:
   *   • The default path (no sundry debtors detected, or operator
   *     unticked Ledgers).
   *   • Edge fallback when the AI parse failed and the operator
   *     still wanted to proceed.
   *
   * `debtorLinks` is intentionally NOT supported here — the async
   * /commit-async endpoint rejects it (server-side). Any
   * commit-with-links flow goes through `fireSyncCommitWithLinks`.
   */
  function fireMastersCommit(
    commit: Parameters<typeof tallyCommitImport.mutate>[0]['commit'],
    overrideForce?: boolean,
  ): void {
    if (!tallyParseResult?.import_id) return;
    tallyEnqueueCommit.mutate(
      {
        import_id: tallyParseResult.import_id,
        commit,
        force: overrideForce ?? tallyForceCommit,
      },
      {
        onSuccess(data) {
          setTallyJobId(data.job_id);
          setTallyCommitResult(null);
          setTallyStep('running');
        },
        onError(error) {
          addToast({
            title: 'Failed to enqueue import',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  /**
   * FeatPlan — Review Debtors step "Confirm & Commit". Validates
   * each decision client-side, then fires the SYNC /commit
   * endpoint with debtor_links. Sync because the BullMQ job row
   * doesn't carry the link payload (see backend
   * tally-import.controller.ts comment on /commit-async).
   *
   * For ~200 debtors this completes in ~30-60s — within nginx's
   * 120s timeout. Heavier imports remain on the legacy bare-
   * ledger path until a follow-up migration lands the
   * debtor-links column on tally_import_jobs.
   */
  function handleConfirmDebtorReview(): void {
    if (!tallyParseResult?.import_id) return;

    // Validate every approved decision before we burn a request.
    const debtorLinks: TallyDebtorLinkInput[] = [];
    const errors: string[] = [];
    for (const row of tallyDebtorRows) {
      const key = row.ledger_id ?? row.name;
      const d = tallyDebtorDecisions[key];
      if (!d) continue;
      const err = validateDecision(d);
      if (d.action === 'approve' && err) {
        errors.push(`${row.name}: ${err}`);
        continue;
      }
      debtorLinks.push({
        ledger_name: row.name,
        skip: d.action === 'skip',
        unit_id: d.unit_id ?? undefined,
        unit_number: d.unit_id ? undefined : d.unit_number || undefined,
        owners:
          d.action === 'approve'
            ? d.owners
                .map((n) => n.trim())
                .filter((n) => n.length > 0)
                .map((name) => ({ name }))
            : undefined,
      });
    }
    if (errors.length > 0) {
      addToast({
        title: 'Some rows need attention',
        description: errors.slice(0, 3).join(' · ') +
          (errors.length > 3 ? ` (+${errors.length - 3} more)` : ''),
        variant: 'destructive',
      });
      return;
    }

    // Build the commit selection from the existing checkboxes.
    const commit: NonNullable<Parameters<typeof tallyCommitImport.mutate>[0]['commit']> = {};
    if (tallyCommitGroups)
      commit.groups = { include_new: true, include_changed: tallyCommitGroupsChanged };
    if (tallyCommitLedgers)
      commit.ledgers = { include_new: true, include_changed: tallyCommitLedgersChanged };
    if (tallyCommitVouchers)
      commit.vouchers = { include_new: true, include_changed: tallyCommitVouchersChanged };
    if (tallyCommitCostCentres)
      commit.cost_centres = { include_new: true, include_changed: tallyCommitCostCentresChanged };
    if (tallyCommitVoucherTypes)
      commit.voucher_types = { include_new: true, include_changed: tallyCommitVoucherTypesChanged };

    // Sync /commit with debtor_links. The hook unwraps to
    // TallyCommitResult including debtor_links result rows.
    tallyCommitImport.mutate(
      {
        import_id: tallyParseResult.import_id,
        commit,
        force: tallyForceCommit,
        debtor_links: debtorLinks,
      },
      {
        onSuccess(response) {
          const result = response.data;
          setTallyCommitResult(result);
          setTallyStep('done');
          const linked =
            result.debtor_links?.filter((l) => l.status === 'linked').length ?? 0;
          const skipped =
            result.debtor_links?.filter((l) => l.status === 'skipped').length ?? 0;
          const failed =
            result.debtor_links?.filter((l) => l.status === 'failed').length ?? 0;
          addToast({
            title: `Imported ${result.records_imported} records`,
            description:
              `Debtors: ${linked} linked, ${skipped} skipped, ${failed} failed.` +
              (result.errors.length > 0
                ? ` ${result.errors.length} ledger errors.`
                : ''),
            variant: failed > 0 ? 'default' : 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to commit import',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  // QA / Phase 2 — the polling hook (useTallyCommitJob) emits the
  // job's terminal state automatically. When that lands, transition
  // to the done step + populate the result for rendering.
  useEffect(() => {
    const job = tallyJobQuery.data;
    if (!job) return;
    if (job.status === 'done') {
      setTallyCommitResult(job.result ?? null);
      setTallyStep('done');
      const imported = job.result?.records_imported ?? 0;
      const errors = job.result?.errors?.length ?? 0;
      addToast({
        title: `Imported ${imported} records`,
        description: errors > 0 ? `${errors} rows had errors — see details.` : undefined,
        variant: 'success',
      });
    } else if (job.status === 'failed') {
      setTallyStep('done');
      setTallyCommitResult(null);
      addToast({
        title: 'Import failed',
        description: job.error_message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tallyJobQuery.data?.status]);

  useEffect(() => {
    if (open) resetTallyForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {/* Tally Import Dialog */}
      <Dialog open={tallyDialogOpen} onOpenChange={setTallyDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from Tally</DialogTitle>
            <DialogDescription>Import account groups, ledgers, and vouchers from Tally ERP</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Upload-in-flight placeholder — neither the active-jobs
                table nor tally_imports has a row during the
                multipart upload + parse phase, but the operator
                still wants to see "something is happening" in the
                strip area they just learned to watch. Renders only
                while the upload mutation is pending. */}
            {tallyStep === 'input' &&
              (tallyXmlUpload.isPending || tallyXmlImport.isPending) && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <div className="text-sm font-medium">
                    Uploading + parsing
                  </div>
                  <div className="flex items-center gap-3 rounded border bg-card px-2 py-1.5 text-xs">
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-blue-500" />
                    <div className="flex-1 space-y-0.5">
                      <div className="font-medium">
                        Parsing your XML…
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        The commit job will appear here once you confirm
                        the preview. Large files (30+ MB) take 10–20s.
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Active jobs strip — shows queued / running / just-
                completed commits across all of the operator's tabs.
                Always visible at the input step so re-opening the
                dialog after closing it doesn't lose the in-flight
                import. */}
            {tallyStep === 'input' &&
              (tallyActiveJobsQuery.data?.length ?? 0) > 0 && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Currently running
                    </span>
                    <span className="text-xs text-muted-foreground">
                      auto-refresh every 3s
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {tallyActiveJobsQuery.data!.map((job) => {
                      const pct =
                        job.total_records > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (job.processed / job.total_records) * 100,
                              ),
                            )
                          : 0;
                      const statusLabel =
                        job.status === 'queued'
                          ? 'Queued'
                          : job.status === 'running'
                            ? `Running · ${job.stage ?? 'starting'}`
                            : job.status === 'done'
                              ? 'Just completed'
                              : job.status === 'failed'
                                ? 'Failed'
                                : 'Cancelled';
                      const inFlight =
                        job.status === 'queued' || job.status === 'running';
                      return (
                        <div
                          key={job.id}
                          className="flex items-center gap-3 rounded border bg-card px-2 py-1.5 text-xs"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              job.status === 'done'
                                ? 'bg-green-500'
                                : job.status === 'failed'
                                  ? 'bg-destructive'
                                  : job.status === 'running'
                                    ? 'animate-pulse bg-blue-500'
                                    : 'bg-muted-foreground'
                            }`}
                          />
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">
                                {statusLabel}
                              </span>
                              <span className="text-muted-foreground">
                                · {job.processed} / {job.total_records}{' '}
                                records ({pct}%)
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Job {job.id.slice(0, 8)} ·{' '}
                              {new Date(job.queued_at).toLocaleTimeString()}
                            </div>
                          </div>
                          {inFlight && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                setTallyJobId(job.id);
                                setTallyStep('running');
                              }}
                            >
                              View progress
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Recent imports history — shows completed runs from
                tally_imports. Always visible at the input step so
                the operator can see the result of imports that
                finished outside the active-jobs 60s window. */}
            {tallyStep === 'input' &&
              (tallyHistoryQuery.data?.length ?? 0) > 0 && (
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Recent imports
                    </span>
                    <span className="text-xs text-muted-foreground">
                      last {Math.min(tallyHistoryQuery.data!.length, 5)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {tallyHistoryQuery.data!.slice(0, 5).map((row) => {
                      const ok = row.status === 'completed';
                      const failed = row.status === 'failed';
                      const inFlight =
                        row.status === 'processing' ||
                        row.status === 'pending';
                      return (
                        <div
                          key={row.id}
                          className="flex items-center gap-3 rounded border bg-card px-2 py-1.5 text-xs"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              ok
                                ? 'bg-green-500'
                                : failed
                                  ? 'bg-destructive'
                                  : inFlight
                                    ? 'animate-pulse bg-blue-500'
                                    : 'bg-muted-foreground'
                            }`}
                          />
                          <div className="flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-x-2 text-xs">
                              <span className="font-medium capitalize">
                                {row.status}
                              </span>
                              <span className="text-muted-foreground">
                                {row.source_type?.toUpperCase()} ·{' '}
                                {row.import_type}
                              </span>
                              {/* Always show parsed → imported / skipped /
                                  failed so the operator can reconcile the
                                  preview's "N records" count against what
                                  actually landed. Zero values are kept
                                  visible so a clean run reads "N parsed
                                  → N imported · 0 skipped · 0 failed". */}
                              <span className="text-muted-foreground tabular-nums">
                                · parsed {row.records_parsed} →
                                imported {row.records_imported} ·
                                skipped {row.records_skipped} ·
                                failed {row.records_failed}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {row.file_name ? `${row.file_name} · ` : ''}
                              {new Date(row.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {tallyStep === 'input' && (
              <>
                {/* Format selector */}
                <div className="space-y-2">
                  <Label>Format</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tally-format"
                        value="xml"
                        checked={tallyFormat === 'xml'}
                        onChange={() => setTallyFormat('xml')}
                        className="accent-primary"
                      />
                      <span className="text-sm">XML</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tally-format"
                        value="csv"
                        checked={tallyFormat === 'csv'}
                        onChange={() => setTallyFormat('csv')}
                        className="accent-primary"
                      />
                      <span className="text-sm">CSV</span>
                    </label>
                  </div>
                </div>

                {/* CSV report type */}
                {tallyFormat === 'csv' && (
                  <div className="space-y-2">
                    <Label htmlFor="tally-csv-type">Report Type</Label>
                    <Select
                      id="tally-csv-type"
                      value={tallyCsvType}
                      onChange={(e) => setTallyCsvType(e.target.value as typeof tallyCsvType)}
                    >
                      <option value="trial_balance">Trial Balance</option>
                      <option value="day_book">Day Book</option>
                      <option value="ledger_report">Ledger Report</option>
                      <option value="receipt_register">Receipt Register</option>
                      <option value="payment_register">Payment Register</option>
                    </Select>
                  </div>
                )}
                {tallyFormat === 'csv' && tallyCsvType === 'ledger_report' && (
                  <TallyCsvLedgerField value={tallyLedgerName} onChange={setTallyLedgerName} />
                )}

                {/* Upload (XML only) — preferred path for files
                    over a few hundred KB. Pasting still works for
                    small snippets via the textarea below. */}
                {tallyFormat === 'xml' && (
                  <div className="space-y-2">
                    <Label htmlFor="tally-file">Upload XML file</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="tally-file"
                        type="file"
                        accept=".xml,text/xml,application/xml"
                        disabled={tallyXmlUpload.isPending}
                        onChange={(e) =>
                          handleTallyFileSelect(e.target.files?.[0] ?? null)
                        }
                        className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:cursor-pointer"
                      />
                      {tallyXmlUpload.isPending && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Uploading…
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Streamed via multipart up to 100 MB. For tiny snippets
                      you can paste below instead.
                    </p>
                  </div>
                )}

                {/* Content area */}
                <div className="space-y-2">
                  <Label htmlFor="tally-content">
                    {tallyFormat === 'xml' ? 'Or paste XML content' : 'Paste CSV Content'}
                  </Label>
                  <Textarea
                    id="tally-content"
                    value={tallyContent}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTallyContent(e.target.value)}
                    placeholder={tallyFormat === 'xml' ? '<ENVELOPE>...</ENVELOPE>' : 'Paste CSV data here...'}
                    rows={tallyFormat === 'xml' ? 6 : 10}
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}

            {/* Preview step — per-type checkbox grid, classification
                breakdown (new/changed/unchanged/conflict), duplicate-
                file warning, and the Force toggle. Nothing in the DB
                yet — Commit fires the actual writes. */}
            {tallyStep === 'preview' && tallyParseResult && (
              <div className="space-y-4">
                {/* FeatPlan — duplicate-file banner with one-click
                    "Replace previous import" CTA. The original UX
                    showed only a small warning + a Force checkbox at
                    the bottom of the preview pane; operators missed
                    it and got confused 409s on re-attempt. Now the
                    Force checkbox is auto-ticked when this banner
                    renders (see handleTallyParse / handleTallyFileSelect)
                    and the prominent button below short-circuits
                    straight into a force-commit. */}
                {tallyParseResult.duplicate_of && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-300 space-y-2 flex-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Same file imported recently — Force is pre-ticked
                      </p>
                      <p className="text-xs">
                        Last committed{' '}
                        <span className="font-medium">
                          {new Date(tallyParseResult.duplicate_of.created_at).toLocaleString()}
                        </span>
                        . Click the button below to re-commit (per-voucher
                        hash check still skips unchanged rows).
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-amber-400 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50"
                        onClick={() => {
                          setTallyForceCommit(true);
                          // Use a microtask so the state update lands
                          // before the commit fires; tallyForceCommit
                          // is read inside fireMastersCommit closure.
                          void Promise.resolve().then(() => handleTallyCommit());
                        }}
                        disabled={
                          tallyEnqueueCommit.isPending ||
                          parseImportDebtors.isPending ||
                          tallyCommitImport.isPending
                        }
                      >
                        Replace previous import
                      </Button>
                    </div>
                  </div>
                )}

                {/* Per-type commit grid */}
                <div className="rounded-md border divide-y">
                  <div className="px-4 py-2 bg-muted/50 text-xs font-medium uppercase tracking-wide flex items-center gap-2">
                    <span className="flex-1">Pick what to import</span>
                    <span className="text-muted-foreground">
                      {tallyParseResult.records_parsed} total parsed
                    </span>
                  </div>
                  {/* Render a row per entity type. The checkbox on
                      the left is the master "commit this type"
                      switch; the sub-checkbox is the
                      "include_changed" guard. */}
                  {([
                    {
                      key: 'groups' as const,
                      label: 'Groups',
                      master: tallyCommitGroups,
                      setMaster: setTallyCommitGroups,
                      changed: tallyCommitGroupsChanged,
                      setChanged: setTallyCommitGroupsChanged,
                      counts: tallyParseResult.counts?.groups ?? 0,
                      cls: tallyParseResult.classification?.groups,
                    },
                    {
                      key: 'ledgers' as const,
                      label: 'Ledgers',
                      master: tallyCommitLedgers,
                      setMaster: setTallyCommitLedgers,
                      changed: tallyCommitLedgersChanged,
                      setChanged: setTallyCommitLedgersChanged,
                      counts: tallyParseResult.counts?.ledgers ?? 0,
                      cls: tallyParseResult.classification?.ledgers,
                    },
                    {
                      key: 'cost_centres' as const,
                      label: 'Cost Centres',
                      master: tallyCommitCostCentres,
                      setMaster: setTallyCommitCostCentres,
                      changed: tallyCommitCostCentresChanged,
                      setChanged: setTallyCommitCostCentresChanged,
                      counts: tallyParseResult.counts?.costCentres ?? 0,
                      cls: tallyParseResult.classification?.cost_centres,
                    },
                    {
                      key: 'voucher_types' as const,
                      label: 'Voucher Types',
                      master: tallyCommitVoucherTypes,
                      setMaster: setTallyCommitVoucherTypes,
                      changed: tallyCommitVoucherTypesChanged,
                      setChanged: setTallyCommitVoucherTypesChanged,
                      counts: tallyParseResult.counts?.voucherTypes ?? 0,
                      cls: tallyParseResult.classification?.voucher_types,
                    },
                    {
                      key: 'vouchers' as const,
                      label: 'Vouchers (transactions)',
                      master: tallyCommitVouchers,
                      setMaster: setTallyCommitVouchers,
                      changed: tallyCommitVouchersChanged,
                      setChanged: setTallyCommitVouchersChanged,
                      counts: tallyParseResult.counts?.vouchers ?? 0,
                      cls: tallyParseResult.classification?.vouchers,
                    },
                  ]).map((row) => {
                    const empty = row.counts === 0;
                    return (
                      <div key={row.key} className="px-4 py-3 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.master}
                            disabled={empty}
                            onChange={(e) => row.setMaster(e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium text-sm flex-1">
                            {row.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.counts} detected
                          </span>
                        </label>
                        {!empty && row.cls && (
                          <div className="ml-6 grid grid-cols-4 gap-2 text-xs">
                            <span>
                              <span className="text-green-600 font-medium">{row.cls.new}</span>{' '}
                              <span className="text-muted-foreground">new</span>
                            </span>
                            <span>
                              <span className="text-blue-600 font-medium">{row.cls.changed}</span>{' '}
                              <span className="text-muted-foreground">changed</span>
                            </span>
                            <span>
                              <span className="text-muted-foreground font-medium">{row.cls.unchanged}</span>{' '}
                              <span className="text-muted-foreground">unchanged</span>
                            </span>
                            <span>
                              <span className={row.cls.conflict > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                {row.cls.conflict}
                              </span>{' '}
                              <span className="text-muted-foreground">conflict</span>
                            </span>
                          </div>
                        )}
                        {!empty && row.master && row.cls && row.cls.changed > 0 && (
                          <label className="ml-6 flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={row.changed}
                              onChange={(e) => row.setChanged(e.target.checked)}
                              className="h-3.5 w-3.5"
                            />
                            <span>
                              Update {row.cls.changed} changed record{row.cls.changed === 1 ? '' : 's'}
                              {' '}— untick to import only new ones
                            </span>
                          </label>
                        )}
                        {!empty && row.cls && row.cls.conflict > 0 && (
                          <p className="ml-6 text-xs text-amber-600 dark:text-amber-500">
                            {row.cls.conflict} record{row.cls.conflict === 1 ? '' : 's'} edited
                            locally — skipped automatically to preserve your changes.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Force toggle — only meaningful when duplicate flagged */}
                {tallyParseResult.duplicate_of && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tallyForceCommit}
                      onChange={(e) => setTallyForceCommit(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">
                      Force re-import (bypass the same-file-recently-imported guard)
                    </span>
                  </label>
                )}

                <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <p className="font-medium">Ready to import</p>
                    <p>
                      Records are parsed but NOT yet saved. Click{' '}
                      <strong>Import</strong> to commit only the ticked types.
                      Unchanged records are no-ops; conflict-flagged records are
                      preserved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Running step — Phase 2 async commit. The polling
                hook (useTallyCommitJob) drives this — every 3s it
                refetches /tally-import/jobs/:id and we render the
                latest stage + progress. The hook stops polling
                automatically when status flips to done/failed; the
                useEffect above transitions to the done step. */}
            {/* FeatPlan — Review Debtors step. Shows the parsed
                sundry-debtor rows with editable inputs; admin
                approves / skips per row before commit fires.
                Strict-gate per Decision (b): every row must be
                reviewed (Approve+Link or Skip) before "Confirm &
                Commit" enables. */}
            {tallyStep === 'review-debtors' && (
              <div className="space-y-4">
                <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <p className="font-medium">
                      Review {tallyDebtorRows.length} sundry-debtor{' '}
                      {tallyDebtorRows.length === 1 ? 'ledger' : 'ledgers'} before commit
                    </p>
                    <p>
                      Each ledger should map to a flat owner. We&rsquo;ve
                      auto-parsed the unit number and owner names from the
                      ledger string &mdash; verify and approve, or skip
                      rows that aren&rsquo;t actual residents (common-area
                      ledgers, GST-paid accounts, etc.). Approved rows
                      will create the unit (if missing), the owner
                      member rows, and the linked customer record.
                    </p>
                  </div>
                </div>
                <DebtorReviewTable
                  rows={tallyDebtorRows}
                  decisions={tallyDebtorDecisions}
                  onChange={setTallyDebtorDecisions}
                  existingUnits={(unitsQuery.data?.data ?? []).map((u) => ({
                    id: u.id,
                    unit_number: u.unit_number,
                  }))}
                  disabled={tallyCommitImport.isPending}
                />
              </div>
            )}

            {tallyStep === 'running' && (
              <div className="space-y-4">
                {(() => {
                  const job = tallyJobQuery.data;
                  const total = job?.total_records ?? tallyParseResult?.records_parsed ?? 0;
                  const done = job?.processed ?? 0;
                  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                  const stageLabel =
                    job?.stage === 'committing'
                      ? 'Writing to your books'
                      : job?.stage === 'starting'
                      ? 'Worker picked up the job'
                      : job?.status === 'queued'
                      ? 'Waiting in queue'
                      : job?.status ?? 'starting';
                  return (
                    <>
                      <div className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
                          <p className="text-sm font-medium">
                            {stageLabel}
                            {job?.status === 'queued' ? '…' : ''}
                          </p>
                        </div>
                        {/* Progress bar — pure CSS, no extra
                            dependency. Value comes from the
                            tally_import_jobs.processed checkpoint. */}
                        <div className="h-2 w-full overflow-hidden rounded bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {done.toLocaleString()} / {total.toLocaleString()} records
                          </span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                      <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                          <p className="font-medium">
                            You can close this dialog
                          </p>
                          <p>
                            The import keeps running in the background.
                            Re-open Tally Import &amp; navigate to the
                            history strip to see the result, or come
                            back to this page in a couple of minutes —
                            invoices / ledger / reports will refresh
                            automatically when the job finishes.
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Done step — per-type disposition breakdown + errors. */}
            {tallyStep === 'done' && tallyCommitResult && (
              <div className="space-y-4">
                <div className="rounded-md border divide-y">
                  <div className="px-4 py-2 bg-muted/50 text-xs font-medium uppercase tracking-wide">
                    Import Result
                  </div>
                  {/* Render a row per type that actually ran */}
                  {(['groups', 'ledgers', 'cost_centres', 'voucher_types', 'vouchers'] as const).map((key) => {
                    const r = tallyCommitResult[key];
                    if (!r) return null;
                    const label =
                      key === 'groups'
                        ? 'Groups'
                        : key === 'ledgers'
                        ? 'Ledgers'
                        : key === 'cost_centres'
                        ? 'Cost Centres'
                        : key === 'voucher_types'
                        ? 'Voucher Types'
                        : 'Vouchers';
                    return (
                      <div key={key} className="px-4 py-3 space-y-1">
                        <div className="flex items-center text-sm font-medium">
                          <span className="flex-1">{label}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.new + r.updated} committed
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <span>
                            <span className="text-green-600 font-medium">{r.new}</span>{' '}
                            <span className="text-muted-foreground">new</span>
                          </span>
                          <span>
                            <span className="text-blue-600 font-medium">{r.updated}</span>{' '}
                            <span className="text-muted-foreground">updated</span>
                          </span>
                          <span>
                            <span className="text-muted-foreground font-medium">{r.unchanged}</span>{' '}
                            <span className="text-muted-foreground">unchanged</span>
                          </span>
                          <span>
                            <span className={r.conflict > 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                              {r.conflict}
                            </span>{' '}
                            <span className="text-muted-foreground">conflict</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-2 text-xs flex items-center gap-4">
                    <span>
                      <strong className="text-green-600">{tallyCommitResult.records_imported}</strong>{' '}
                      <span className="text-muted-foreground">total imported</span>
                    </span>
                    <span>
                      <strong className="text-yellow-600">{tallyCommitResult.records_skipped}</strong>{' '}
                      <span className="text-muted-foreground">skipped</span>
                    </span>
                  </div>
                </div>
                {(tallyCommitResult.errors?.length ?? 0) > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 space-y-1">
                    <h4 className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Errors ({tallyCommitResult.errors!.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {(tallyCommitResult.errors ?? []).map((err, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">
                          {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {tallyCommitResult.records_imported > 0 && (
                  <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Successfully imported {tallyCommitResult.records_imported} records.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">
                {/* The dialog never aborts an in-flight commit — the
                    BullMQ worker keeps running once /commit-async
                    accepts the job. While 'running' or 'done', the
                    button is a pure dismiss → label as "Close" so
                    operators don't fear it'll cancel the import. The
                    'input' / 'preview' / 'review-debtors' steps are
                    still pre-commit so 'Cancel' reads correctly there. */}
                {tallyStep === 'running' || tallyStep === 'done'
                  ? 'Close'
                  : 'Cancel'}
              </Button>
            </DialogClose>
            {tallyStep === 'input' && (
              <Button
                onClick={handleTallyParse}
                disabled={
                  tallyXmlImport.isPending ||
                  tallyCsvImport.isPending ||
                  // Block the paste/Parse path while a file upload is
                  // in flight — same preview slot, same toast space,
                  // can't run both. The button label flips so the
                  // operator can see why.
                  tallyXmlUpload.isPending
                }
              >
                {tallyXmlUpload.isPending
                  ? 'Uploading…'
                  : tallyXmlImport.isPending || tallyCsvImport.isPending
                  ? 'Parsing…'
                  : 'Parse'}
              </Button>
            )}
            {tallyStep === 'preview' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTallyParseResult(null);
                    setTallyStep('input');
                  }}
                  disabled={
                    tallyEnqueueCommit.isPending || parseImportDebtors.isPending
                  }
                >
                  Back
                </Button>
                <Button
                  onClick={handleTallyCommit}
                  disabled={
                    tallyEnqueueCommit.isPending || parseImportDebtors.isPending
                  }
                >
                  {parseImportDebtors.isPending
                    ? 'Parsing debtors…'
                    : tallyEnqueueCommit.isPending
                      ? 'Queuing…'
                      : 'Import'}
                </Button>
              </>
            )}
            {/* FeatPlan — Review Debtors footer. Back returns to the
                preview without losing decisions in case admin wants
                to retick types. Confirm fires the sync /commit with
                debtor_links. */}
            {tallyStep === 'review-debtors' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setTallyStep('preview')}
                  disabled={tallyCommitImport.isPending}
                >
                  Back to Preview
                </Button>
                <Button
                  onClick={handleConfirmDebtorReview}
                  disabled={tallyCommitImport.isPending}
                >
                  {tallyCommitImport.isPending
                    ? 'Importing…'
                    : 'Confirm & Commit'}
                </Button>
              </>
            )}
            {tallyStep === 'running' && (
              // No Import button on this step — the operator's only
              // action is to close the dialog (the job keeps running).
              <span className="text-xs text-muted-foreground">
                Job ID: <code className="font-mono">{tallyJobId.slice(0, 8)}</code>
              </span>
            )}
            {tallyStep === 'done' && (
              <Button variant="outline" onClick={() => { resetTallyForm(); }}>
                Import Another
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
