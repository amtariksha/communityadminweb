'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, FileText, Eye, ShieldCheck, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { useKycRecords, useVerifyKyc, useRejectKyc, type KycRecord } from '@/hooks';

export function KycContent() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data: records = [], isLoading } = useKycRecords(statusFilter, search);
  const verifyKyc = useVerifyKyc();
  const rejectKyc = useRejectKyc();
  const { addToast: toast } = useToast();

  const [selectedDoc, setSelectedDoc] = useState<KycRecord | null>(null);
  const [rejectDialogDoc, setRejectDialogDoc] = useState<KycRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleVerify = async (doc: KycRecord) => {
    try {
      await verifyKyc.mutateAsync({ id: doc.id });
      toast({ title: 'Verified', description: `KYC for ${doc.member_name || 'resident'} approved` });
    } catch {
      toast({ title: 'Error', description: 'Failed to verify KYC', variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    if (!rejectDialogDoc || !rejectReason.trim()) return;
    try {
      await rejectKyc.mutateAsync({ id: rejectDialogDoc.id, reason: rejectReason });
      toast({ title: 'Rejected', description: 'KYC proof marked as rejected' });
      setRejectDialogDoc(null);
      setRejectReason('');
    } catch {
      toast({ title: 'Error', description: 'Failed to reject KYC', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="KYC Verification Queue"
        description="Review and verify government ID proofs (Aadhaar, Passport, Driving License) submitted by owners and tenants."
        breadcrumbs={[
          { label: 'Management', href: '/units' },
          { label: 'KYC Verification' },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'pending', 'verified', 'rejected'].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="capitalize"
            >
              {st}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, flat, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted KYC Records</CardTitle>
          <CardDescription>
            Showing {records.length} document verification record(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading KYC queue...</div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ShieldCheck className="mb-2 h-10 w-10 text-muted-foreground/60" />
              <p className="text-base font-medium">No KYC records matching filter</p>
              <p className="text-sm">Submitted proofs will populate here automatically.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident & Flat</TableHead>
                  <TableHead>ID Type & Number</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.member_name || 'Resident'}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.unit_number ? `Flat ${r.unit_number}` : 'No flat'} · <span className="capitalize">{r.member_type || 'member'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium capitalize">{r.id_type}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.id_number}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(r.submitted_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === 'verified' || r.status === 'approved'
                            ? 'success'
                            : r.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDoc(r)}
                        className="h-8 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Proof
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleVerify(r)}
                            disabled={verifyKyc.isPending}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Verify
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRejectDialogDoc(r);
                              setRejectReason('');
                            }}
                            className="h-8 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.verifier_name ? `By ${r.verifier_name}` : 'Reviewed'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lightbox / Document Preview Modal */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Preview: {selectedDoc?.id_type}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.member_name} · Flat {selectedDoc?.unit_number} · ID: {selectedDoc?.id_number}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {selectedDoc?.document_url ? (
              <div className="relative max-h-[70vh] w-full overflow-hidden rounded-md border bg-slate-50 flex items-center justify-center">
                {selectedDoc.document_url.endsWith('.pdf') ? (
                  <iframe
                    src={selectedDoc.document_url}
                    className="h-[500px] w-full"
                    title="Document PDF"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedDoc.document_url}
                    alt="ID Document"
                    className="max-h-[500px] w-auto object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <FileText className="mb-2 h-10 w-10" />
                <p>No document preview available</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDoc(null)}>
              Close
            </Button>
            {selectedDoc?.status === 'pending' && (
              <Button
                onClick={() => {
                  if (selectedDoc) handleVerify(selectedDoc);
                  setSelectedDoc(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> Verify ID Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectDialogDoc} onOpenChange={(open) => !open && setRejectDialogDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Submission</DialogTitle>
            <DialogDescription>
              Please specify the reason for rejecting {rejectDialogDoc?.member_name}&apos;s proof.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g. Blurry photo, expired ID, name mismatch..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectKyc.isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
