import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { BulkImportModal } from '@/components/BulkImportModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/exportExcel';

const schema = z.object({
  admission: z.string().min(1, 'Admission required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: z.enum(['cash', 'upi', 'card', 'bank-transfer', 'cheque']),
  receiptNo: z.string().optional(),
  notes: z.string().optional(),
});

export const CollectionsPage = () => {
  const [items, setItems] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { method: 'cash' },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, admList] = await Promise.all([
        api.get('/collections', { params: { limit: 100 } }),
        api.get('/admissions', { params: { limit: 200 } }),
      ]);
      setItems(list.data.data);
      setAdmissions(admList.data.data);
    } catch {
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/collections', data);
      toast.success('Collection recorded');
      setOpen(false);
      reset({ method: 'cash' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleExport = () => {
    try {
      const name = exportToExcel({
        filename: 'collections',
        sheetName: 'Collections',
        rows: items,
        columns: [
          {
            header: 'Receipt #',
            accessor: (c) => c.receiptNo || c._id?.slice(-6).toUpperCase() || '',
          },
          { header: 'Student Name', accessor: (c) => c.admission?.name || '' },
          { header: 'Course', accessor: (c) => c.admission?.course || '' },
          { header: 'Method', accessor: 'method' },
          { header: 'Amount', accessor: (c) => c.amount || 0 },
          { header: 'Received On', accessor: (c) => c.receivedOn ? new Date(c.receivedOn) : '' },
          { header: 'Notes', accessor: 'notes' },
        ],
      });
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const totalCollected = items.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Total received: <span className="font-medium text-foreground">{formatCurrency(totalCollected)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Receipt #</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Received On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No collections yet</td></tr>
                ) : (
                  items.map((c) => (
                    <tr key={c._id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {c.receiptNo || c._id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium">{c.admission?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.team?.name || '—'}</td>
                      <td className="px-4 py-3"><Badge variant="info">{c.method}</Badge></td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {formatCurrency(c.amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.receivedOn)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); reset({ method: 'cash' }); }} title="Record Payment">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Admission" error={errors.admission}>
            <Select {...register('admission')}>
              <option value="">Select admission...</option>
              {admissions.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} — {formatCurrency(a.feeAmount)} ({a.course || a.team?.name || '—'})
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)" error={errors.amount}>
              <Input type="number" placeholder="0" {...register('amount')} />
            </Field>
            <Field label="Method" error={errors.method}>
              <Select {...register('method')}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank-transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </Select>
            </Field>
          </div>
          <Field label="Receipt # (optional)">
            <Input placeholder="Auto-generated if blank" {...register('receiptNo')} />
          </Field>
          <Field label="Notes (optional)">
            <Input placeholder="Any details" {...register('notes')} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset({ method: 'cash' }); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        resource="collections"
        resourceLabel="Collections"
        onSuccess={fetchData}
      />
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium">{label}</label>
    {children}
    {error && <p className="text-xs text-destructive">{error.message}</p>}
  </div>
);
