import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().optional(),
  designation: z.string().optional(),
  team: z.string().min(1, 'Team required'),
});

export const EmployeesPage = () => {
  const [items, setItems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, teamList] = await Promise.all([
        api.get('/employees', { params: { limit: 500 } }),
        api.get('/teams'),
      ]);
      setItems(list.data.data);
      setTeams(teamList.data.data);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/employees', data);
      toast.success('Employee added');
      setOpen(false);
      reset();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">{items.length} total staff members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New Employee
          </Button>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Team</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
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
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No employees yet</td></tr>
                ) : (
                  items.map((e) => (
                    <tr key={e._id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {e.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium">{e.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.designation || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.team?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={e.status === 'active' ? 'success' : 'default'}>{e.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.joinedOn)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title="New Employee">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name}>
            <Input placeholder="Full name" {...register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" error={errors.phone}>
              <Input placeholder="Optional" {...register('phone')} />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input type="email" placeholder="Optional" {...register('email')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Designation" error={errors.designation}>
              <Input placeholder="e.g. Counsellor, Manager" {...register('designation')} />
            </Field>
            <Field label="Team" error={errors.team}>
              <Select {...register('team')}>
                <option value="">Select team...</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        resource="employees"
        resourceLabel="Employees"
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
