'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, Power } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { GstRateSelect } from '@/components/ui/gst-rate-select';
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
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { ruleGst, ruleGstLabel } from '@/lib/invoice-rule';
import {
  useCreateInvoiceRule,
  useDeactivateInvoiceRule,
  useInvoiceRules,
  useLedgerAccounts,
  useUpdateInvoiceRule,
} from '@/hooks';

/**
 * Settings › Billing Rules: the society-wide recurring charges invoices are
 * generated from. "Off" switches a rule off (the row is kept); an edit sends
 * the form's GST fields, which the API turns into the stored ones (INC-10).
 */
export function BillingRulesCard(): ReactNode {
  const { addToast } = useToast();
  const rulesQuery = useInvoiceRules();
  const rules = rulesQuery.data ?? [];
  // Ledger accounts for the billing-rule "Ledger Account" dropdown.
  const ledgerAccountsQuery = useLedgerAccounts();
  const ledgerAccounts = ledgerAccountsQuery.data?.data ?? [];
  const createRule = useCreateInvoiceRule();
  const updateRule = useUpdateInvoiceRule();
  const deactivateRule = useDeactivateInvoiceRule();

  // Rule dialog state — mirrors the Invoices page form so the two
  // rule-creation surfaces stay consistent (same fields, same payload
  // shape, same charge-type modes).
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [ruleLedgerAccountId, setRuleLedgerAccountId] = useState('');
  const [ruleFrequency, setRuleFrequency] = useState('monthly');
  const [ruleChargeType, setRuleChargeType] = useState<'flat' | 'area_based'>('flat');
  const [ruleFlatAmount, setRuleFlatAmount] = useState('');
  const [ruleRatePerSqft, setRuleRatePerSqft] = useState('');
  const [ruleIsGstApplicable, setRuleIsGstApplicable] = useState(false);
  const [ruleGstRate, setRuleGstRate] = useState('');


  function resetRuleForm(): void {
    setEditingRuleId('');
    setRuleName('');
    setRuleLedgerAccountId('');
    setRuleFrequency('monthly');
    setRuleChargeType('flat');
    setRuleFlatAmount('');
    setRuleRatePerSqft('');
    setRuleIsGstApplicable(false);
    setRuleGstRate('');
  }

  function handleOpenEditRule(rule: {
    id: string;
    name: string;
    ledger_account_id?: string;
    frequency: string;
    amount: number;
    charge_type?: 'flat' | 'area_based' | 'hybrid';
    is_per_sqft?: boolean;
    gst_rule?: string | null;
    gst_percentage?: number | string | null;
    is_gst_applicable?: boolean;
    gst_rate?: number | string | null;
  }): void {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleLedgerAccountId(rule.ledger_account_id ?? '');
    setRuleFrequency(rule.frequency);
    // Derive the UI mode from whichever signal the API row carries. Old
    // rows without charge_type fall back to is_per_sqft.
    const isPerSqft =
      rule.charge_type === 'area_based' || rule.is_per_sqft === true;
    setRuleChargeType(isPerSqft ? 'area_based' : 'flat');
    setRuleFlatAmount(isPerSqft ? '' : String(rule.amount));
    setRuleRatePerSqft(isPerSqft ? String(rule.amount) : '');
    const gst = ruleGst(rule);
    setRuleIsGstApplicable(gst.applies);
    setRuleGstRate(gst.rate ? String(gst.rate) : '');
    setRuleDialogOpen(true);
  }

  function handleSaveRule(e: FormEvent): void {
    e.preventDefault();

    // Build the payload the same way the Invoices page does so both
    // surfaces produce rules the backend can interpret consistently.
    // flat       → amount (backend: is_per_sqft = false)
    // area_based → rate_per_sqft (backend: is_per_sqft = true, ×area_sqft)
    type RuleData = {
      name: string;
      ledger_account_id: string;
      frequency: string;
      charge_type: 'flat' | 'area_based';
      amount?: number;
      flat_amount?: number;
      rate_per_sqft?: number;
      is_gst_applicable?: boolean;
      gst_rule?: 'none' | 'full';
      gst_rate?: number;
    };
    const data: RuleData = {
      name: ruleName,
      ledger_account_id: ruleLedgerAccountId,
      frequency: ruleFrequency,
      charge_type: ruleChargeType,
    };
    if (ruleChargeType === 'flat') {
      const amt = Number(ruleFlatAmount) || 0;
      data.amount = amt;
      data.flat_amount = amt;
    } else {
      const rate = Number(ruleRatePerSqft) || 0;
      data.amount = rate;
      data.rate_per_sqft = rate;
    }
    // Always say whether GST applies: leaving it out of an edit would keep
    // the rule's old GST when the box was just unticked.
    data.is_gst_applicable = ruleIsGstApplicable;
    if (ruleIsGstApplicable) {
      data.gst_rule = 'full';
      data.gst_rate = ruleGstRate ? Number(ruleGstRate) : 0;
    }

    if (editingRuleId) {
      updateRule.mutate(
        { id: editingRuleId, data },
        {
          onSuccess() {
            setRuleDialogOpen(false);
            resetRuleForm();
            addToast({ title: 'Billing rule updated', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to update rule', description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    } else {
      createRule.mutate(data, {
        onSuccess() {
          setRuleDialogOpen(false);
          resetRuleForm();
          addToast({ title: 'Billing rule created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create rule', description: friendlyError(error), variant: 'destructive' });
        },
      });
    }
  }

  function handleDeactivateRule(ruleId: string): void {
    deactivateRule.mutate(
      ruleId,
      {
        onSuccess() {
          addToast({ title: 'Billing rule deactivated', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to deactivate rule', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  return (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Billing Rules</CardTitle>
        <Dialog open={ruleDialogOpen} onOpenChange={(open) => { setRuleDialogOpen(open); if (!open) resetRuleForm(); }}>
          <DialogTrigger>
            <Button size="sm" onClick={() => resetRuleForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSaveRule}>
              <DialogHeader>
                <DialogTitle>{editingRuleId ? 'Edit Billing Rule' : 'Create Billing Rule'}</DialogTitle>
                <DialogDescription>
                  {editingRuleId
                    ? 'Update the billing rule configuration'
                    : 'Define a new recurring billing rule for invoicing'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    required
                    placeholder="e.g., Monthly Maintenance"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-account">Ledger Account</Label>
                  <Select
                    id="rule-account"
                    required
                    value={ruleLedgerAccountId}
                    onChange={(e) => setRuleLedgerAccountId(e.target.value)}
                  >
                    <option value="">Select an account…</option>
                    {ledgerAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code ? `${acc.code} — ${acc.name}` : acc.name}
                      </option>
                    ))}
                  </Select>
                  {ledgerAccounts.length === 0 && !ledgerAccountsQuery.isLoading && (
                    <p className="text-xs text-muted-foreground">
                      No ledger accounts exist yet. Create them under
                      Accounts before defining a billing rule.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-frequency">Frequency</Label>
                    <Select
                      id="rule-frequency"
                      value={ruleFrequency}
                      onChange={(e) => setRuleFrequency(e.target.value)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="half_yearly">Half-Yearly</option>
                      <option value="yearly">Yearly</option>
                      <option value="one_time">One-Time</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-charge-type">Charge Type</Label>
                    <Select
                      id="rule-charge-type"
                      value={ruleChargeType}
                      onChange={(e) =>
                        setRuleChargeType(e.target.value as 'flat' | 'area_based')
                      }
                      required
                    >
                      <option value="flat">Flat Amount</option>
                      <option value="area_based">Per Sq Ft</option>
                    </Select>
                  </div>
                </div>
                {ruleChargeType === 'flat' ? (
                  <div className="space-y-2">
                    <Label htmlFor="rule-flat-amount">Amount (₹)</Label>
                    <Input
                      id="rule-flat-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="3000"
                      value={ruleFlatAmount}
                      onChange={(e) => setRuleFlatAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      One fixed amount billed per unit regardless of size.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="rule-rate-per-sqft">Rate per Sq Ft (₹)</Label>
                    <Input
                      id="rule-rate-per-sqft"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="2.50"
                      value={ruleRatePerSqft}
                      onChange={(e) => setRuleRatePerSqft(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Invoice = rate × unit.area_sqft. Example: 2.50 × 1,200 sqft = ₹3,000.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="rule-gst"
                    checked={ruleIsGstApplicable}
                    onChange={(e) => setRuleIsGstApplicable(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="rule-gst" className="mb-0">GST Applicable</Label>
                </div>
                {ruleIsGstApplicable && (
                  <div className="space-y-2">
                    <Label htmlFor="rule-gst-rate">GST Rate</Label>
                    <GstRateSelect
                      id="rule-gst-rate"
                      allowNone={false}
                      value={ruleGstRate ? Number(ruleGstRate) : null}
                      onChange={(v) => setRuleGstRate(v == null ? '' : String(v))}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                  {(createRule.isPending || updateRule.isPending) ? 'Saving...' : 'Save Rule'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </CardHeader>
    <CardContent>
      {rulesQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rules.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell className="capitalize">{rule.frequency?.replace('_', ' ')}</TableCell>
                <TableCell className="text-right">{formatCurrency(rule.amount)}</TableCell>
                <TableCell>
                  {ruleGst(rule).applies ? (
                    <span className="text-sm">{ruleGstLabel(rule)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={rule.is_active ? 'success' : 'secondary'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 p-1 text-xs"
                      onClick={() => handleOpenEditRule(rule)}
                    >
                      Edit
                    </Button>
                    {rule.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 p-1 text-xs text-destructive"
                        onClick={() => handleDeactivateRule(rule.id)}
                        disabled={deactivateRule.isPending}
                      >
                        <Power className="mr-1 h-3 w-3" />
                        Off
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="py-8 text-center text-muted-foreground">No billing rules configured. Create one to start generating invoices.</p>
      )}
    </CardContent>
  </Card>
  );
}
