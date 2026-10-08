'use client';

import { useState } from 'react';
import {
  Package,
  FileCheck,
  ShoppingCart,
  ClipboardList,
  Wrench,
  ArrowDownUp,
  Plus,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  useMaterials,
  useCreateMaterial,
  useLOIs,
  useCreateLOI,
  useConvertLOIToPO,
  useInventoryPurchaseOrders,
  useCreateInventoryPurchaseOrder,
  useGRNs,
  useCreateGRN,
  useWorkOrders,
  useCreateWorkOrder,
  useStockLogs,
  useRecordStockMovement,
  useStaffEmployees,
} from '@/hooks';

export function InventoryContent() {
  const [activeTab, setActiveTab] = useState<'materials' | 'loi' | 'po' | 'grn' | 'wo' | 'logs'>('materials');
  const { addToast: toast } = useToast();

  // Queries
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const { data: lois = [], isLoading: loisLoading } = useLOIs();
  const { data: pos = [], isLoading: posLoading } = useInventoryPurchaseOrders();
  const { data: grns = [], isLoading: grnsLoading } = useGRNs();
  const { data: wos = [], isLoading: wosLoading } = useWorkOrders();
  const { data: logs = [], isLoading: logsLoading } = useStockLogs();
  const { data: staffData } = useStaffEmployees();
  const staffList = staffData?.data ?? [];

  // Mutations
  const createMaterial = useCreateMaterial();
  const createLOI = useCreateLOI();
  const convertLoiToPo = useConvertLOIToPO();
  const createPO = useCreateInventoryPurchaseOrder();
  const createGRN = useCreateGRN();
  const createWO = useCreateWorkOrder();
  const recordMovement = useRecordStockMovement();

  // Dialog States
  const [matOpen, setMatOpen] = useState(false);
  const [loiOpen, setLoiOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState(false);
  const [woOpen, setWoOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // Form States
  const [matForm, setMatForm] = useState({ name: '', category: 'Electrical', unit: 'PCS', current_stock: 0, minimum_stock: 5, unit_price: 0, location: '' });
  const [loiForm, setLoiForm] = useState({ vendor: '', title: '', estimated_value: 0, valid_until: '', deliverables: '' });
  const [poForm, setPoForm] = useState({ vendor_name: '', total_amount: 0, tax_amount: 0, delivery_date: '', notes: '' });
  const [grnForm, setGrnForm] = useState({ vendor_name: '', received_by: '', items_count: 1, invoice_number: '', notes: '' });
  const [woForm, setWoForm] = useState({ title: '', category: 'Maintenance', assigned_to: '', materials_used: 0, cost: 0 });
  const [moveForm, setMoveForm] = useState({ material_id: '', movement_type: 'IN' as 'IN' | 'OUT', quantity: 1, notes: '' });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Procurement"
        description="Manage society materials, stock levels, Letters of Intent (LOI), Purchase Orders, and Goods Received Notes."
        breadcrumbs={[
          { label: 'Management', href: '/assets' },
          { label: 'Inventory' },
        ]}
      />

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {[
          { key: 'materials', label: 'Stock Catalogue', icon: Package },
          { key: 'loi', label: 'Letters of Intent (LOI)', icon: FileCheck },
          { key: 'po', label: 'Purchase Orders', icon: ShoppingCart },
          { key: 'grn', label: 'Goods Received (GRN)', icon: ClipboardList },
          { key: 'wo', label: 'Work Orders', icon: Wrench },
          { key: 'logs', label: 'Movement Logs', icon: ArrowDownUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              variant={active ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* 1. Stock Catalogue Tab */}
      {activeTab === 'materials' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Material Stock Catalogue</CardTitle>
              <CardDescription>Live stock counts with automatic low-stock alerts.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMoveOpen(true)}>
                <ArrowDownUp className="mr-2 h-4 w-4" /> Stock In / Out
              </Button>
              <Button size="sm" onClick={() => setMatOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Material
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {materialsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading stock catalogue...</div>
            ) : materials.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No materials registered. Click &quot;Add Material&quot;.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code & Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Threshold</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m) => {
                    const isLow = Number(m.current_stock) <= Number(m.minimum_stock);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{m.item_code}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{m.category}</Badge></TableCell>
                        <TableCell className="font-semibold">
                          {m.current_stock} {m.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.minimum_stock} {m.unit}</TableCell>
                        <TableCell>{formatCurrency(m.unit_price)}</TableCell>
                        <TableCell>{m.location || '—'}</TableCell>
                        <TableCell className="text-right">
                          {isLow ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="success">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Letters of Intent (LOI) Tab */}
      {activeTab === 'loi' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Letters of Intent (LOI)</CardTitle>
              <CardDescription>Issue vendor LOIs and convert them to Purchase Orders in 1-click.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setLoiOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Issue LOI
            </Button>
          </CardHeader>
          <CardContent>
            {loisLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading LOIs...</div>
            ) : lois.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No Letters of Intent issued yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LOI Number & Title</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Estimated Value</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lois.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{l.title}</div>
                        <div className="font-mono text-xs text-muted-foreground">{l.loi_number}</div>
                      </TableCell>
                      <TableCell>{l.vendor}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(l.estimated_value)}</TableCell>
                      <TableCell>{formatDate(l.valid_until)}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'converted' ? 'success' : 'default'} className="capitalize">
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.status === 'issued' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                const res = await convertLoiToPo.mutateAsync(l.id);
                                toast({ title: 'Converted', description: `PO ${res.po_number} created!` });
                                setActiveTab('po');
                              } catch {
                                toast({ title: 'Error', description: 'Failed to convert LOI to PO', variant: 'destructive' });
                              }
                            }}
                            disabled={convertLoiToPo.isPending}
                            className="gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            Convert to PO <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Processed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Purchase Orders (PO) Tab */}
      {activeTab === 'po' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Procurement orders issued to vendors and suppliers.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setPoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create PO
            </Button>
          </CardHeader>
          <CardContent>
            {posLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading purchase orders...</div>
            ) : pos.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No purchase orders created yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>PO Date</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-medium">{p.po_number}</TableCell>
                      <TableCell>{p.vendor_name}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.total_amount)}</TableCell>
                      <TableCell>{formatDate(p.po_date)}</TableCell>
                      <TableCell>{formatDate(p.delivery_date)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="capitalize">{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Goods Received Notes (GRN) Tab */}
      {activeTab === 'grn' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Goods Received Notes (GRN)</CardTitle>
              <CardDescription>Gate & store delivery acceptance tracking with assigned staff receiver.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setGrnOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record GRN
            </Button>
          </CardHeader>
          <CardContent>
            {grnsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading GRNs...</div>
            ) : grns.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No goods received notes recorded.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Items Count</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grns.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono font-medium">{g.grn_number}</TableCell>
                      <TableCell>{g.vendor_name}</TableCell>
                      <TableCell>{g.received_by}</TableCell>
                      <TableCell>{formatDate(g.received_date)}</TableCell>
                      <TableCell>{g.items_count} items</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="success" className="capitalize">{g.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Work Orders (WO) Tab */}
      {activeTab === 'wo' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Maintenance Work Orders</CardTitle>
              <CardDescription>Society maintenance and equipment repair assignments.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setWoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Work Order
            </Button>
          </CardHeader>
          <CardContent>
            {wosLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading work orders...</div>
            ) : wos.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No work orders recorded.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WO Number & Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wos.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-medium">{w.title}</div>
                        <div className="font-mono text-xs text-muted-foreground">{w.wo_number}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{w.category}</Badge></TableCell>
                      <TableCell>{w.assigned_to || 'Unassigned'}</TableCell>
                      <TableCell>{formatCurrency(w.cost)}</TableCell>
                      <TableCell>{formatDate(w.wo_date)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="capitalize">{w.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Stock Movement Logs Tab */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle>Inventory Movement Logs</CardTitle>
            <CardDescription>Audit history of goods checked in and checked out from store.</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading movement logs...</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No stock movements recorded yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-medium">{log.material_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{log.item_code}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.movement_type === 'IN' ? 'success' : 'destructive'}>
                          Stock {log.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{log.quantity}</TableCell>
                      <TableCell>{log.balance}</TableCell>
                      <TableCell>{formatDate(log.log_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{log.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals & Dialogs */}

      {/* Add Material Dialog */}
      <Dialog open={matOpen} onOpenChange={setMatOpen}>
        <DialogContent>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createMaterial.mutateAsync(matForm);
              toast({ title: 'Success', description: 'Material added to catalogue' });
              setMatOpen(false);
            } catch {
              toast({ title: 'Error', description: 'Failed to create material', variant: 'destructive' });
            }
          }}>
            <DialogHeader>
              <DialogTitle>Add Material to Catalogue</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div>
                <Label>Material Name *</Label>
                <Input value={matForm.name} onChange={(e) => setMatForm({ ...matForm, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={matForm.category} onChange={(e) => setMatForm({ ...matForm, category: e.target.value })}>
                    {['Electrical', 'Plumbing', 'Housekeeping', 'Civil', 'Pool Chemicals', 'Security', 'General'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Unit of Measure</Label>
                  <Select value={matForm.unit} onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })}>
                    {['PCS', 'KG', 'LITERS', 'BOX', 'METERS', 'ROLL'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Current Stock</Label>
                  <Input type="number" value={matForm.current_stock} onChange={(e) => setMatForm({ ...matForm, current_stock: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Min. Reorder Level</Label>
                  <Input type="number" value={matForm.minimum_stock} onChange={(e) => setMatForm({ ...matForm, minimum_stock: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Store Location</Label>
                <Input placeholder="e.g. Store Room Rack A-2" value={matForm.location} onChange={(e) => setMatForm({ ...matForm, location: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={createMaterial.isPending}>Save Material</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add LOI Dialog */}
      <Dialog open={loiOpen} onOpenChange={setLoiOpen}>
        <DialogContent>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createLOI.mutateAsync(loiForm);
              toast({ title: 'Success', description: 'Letter of Intent issued' });
              setLoiOpen(false);
            } catch {
              toast({ title: 'Error', description: 'Failed to issue LOI', variant: 'destructive' });
            }
          }}>
            <DialogHeader>
              <DialogTitle>Issue Letter of Intent (LOI)</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div>
                <Label>Vendor / Contractor Name *</Label>
                <Input value={loiForm.vendor} onChange={(e) => setLoiForm({ ...loiForm, vendor: e.target.value })} required />
              </div>
              <div>
                <Label>Project / Intent Title *</Label>
                <Input placeholder="e.g. Annual STP Plant Overhaul Contract" value={loiForm.title} onChange={(e) => setLoiForm({ ...loiForm, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estimated Value (INR)</Label>
                  <Input type="number" value={loiForm.estimated_value} onChange={(e) => setLoiForm({ ...loiForm, estimated_value: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input type="date" value={loiForm.valid_until} onChange={(e) => setLoiForm({ ...loiForm, valid_until: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Deliverables / Scope</Label>
                <Input placeholder="Scope of services" value={loiForm.deliverables} onChange={(e) => setLoiForm({ ...loiForm, deliverables: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={createLOI.isPending}>Issue LOI</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record GRN Dialog with Staff Dropdown */}
      <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
        <DialogContent>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createGRN.mutateAsync(grnForm);
              toast({ title: 'Success', description: 'Goods Received Note recorded' });
              setGrnOpen(false);
            } catch {
              toast({ title: 'Error', description: 'Failed to record GRN', variant: 'destructive' });
            }
          }}>
            <DialogHeader>
              <DialogTitle>Record Goods Received Note (GRN)</DialogTitle>
              <DialogDescription>Acknowledge delivery of materials at society gate or store.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div>
                <Label>Vendor / Supplier Name *</Label>
                <Input value={grnForm.vendor_name} onChange={(e) => setGrnForm({ ...grnForm, vendor_name: e.target.value })} required />
              </div>
              <div>
                <Label>Received By (Staff Member) *</Label>
                <Select value={grnForm.received_by} onChange={(e) => setGrnForm({ ...grnForm, received_by: e.target.value })} required>
                  <option value="">Select staff employee</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.designation || 'Staff'})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Items Count</Label>
                  <Input type="number" value={grnForm.items_count} onChange={(e) => setGrnForm({ ...grnForm, items_count: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Vendor Invoice / DC #</Label>
                  <Input value={grnForm.invoice_number} onChange={(e) => setGrnForm({ ...grnForm, invoice_number: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={createGRN.isPending}>Record GRN</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Stock Movement Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!moveForm.material_id) return;
            try {
              await recordMovement.mutateAsync(moveForm);
              toast({ title: 'Success', description: `Stock ${moveForm.movement_type} recorded successfully` });
              setMoveOpen(false);
            } catch {
              toast({ title: 'Error', description: 'Failed to record movement', variant: 'destructive' });
            }
          }}>
            <DialogHeader>
              <DialogTitle>Record Stock In / Out</DialogTitle>
              <DialogDescription>Adjust inventory balance with an audit log record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div>
                <Label>Select Material *</Label>
                <Select value={moveForm.material_id} onChange={(e) => setMoveForm({ ...moveForm, material_id: e.target.value })} required>
                  <option value="">Choose material from catalogue</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.item_code}) — Current: {m.current_stock} {m.unit}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Movement Type *</Label>
                  <Select value={moveForm.movement_type} onChange={(e) => setMoveForm({ ...moveForm, movement_type: e.target.value as 'IN' | 'OUT' })}>
                    <option value="IN">Stock IN (+ Add)</option>
                    <option value="OUT">Stock OUT (- Dispense)</option>
                  </Select>
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input type="number" min="1" value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: Number(e.target.value) })} required />
                </div>
              </div>
              <div>
                <Label>Notes / Reason</Label>
                <Input placeholder="e.g. Issued for Tower B Lift repair" value={moveForm.notes} onChange={(e) => setMoveForm({ ...moveForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={recordMovement.isPending}>Commit Movement</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
