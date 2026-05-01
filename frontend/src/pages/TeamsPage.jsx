import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  description: z.string().optional(),
  monthlyTarget: z.coerce.number().nonnegative('Must be 0 or more'),
  color: z.string().optional(),
});

export const TeamsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1', monthlyTarget: 0 },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/teams');
      setItems(data.data);
    } catch {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/teams', data);
      toast.success('Team created');
      setOpen(false);
      reset({ color: '#6366f1', monthlyTarget: 0 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this team? Linked employees and admissions will keep the reference.')) return;
    try {
      await api.delete(`/teams/${id}`);
      toast.success('Team deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleTargetUpdate = async (id, monthlyTarget) => {
    try {
      await api.put(`/teams/${id}`, { monthlyTarget: Number(monthlyTarget) });
      toast.success('Target updated');
      fetchData();
    } catch {
      toast.error('Failed to update');
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
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage teams and monthly revenue targets</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Team
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No teams yet — create one to get started
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t._id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-lg" style={{ background: t.color }} />
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.description || 'No description'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(t._id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Monthly Target</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={t.monthlyTarget}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== t.monthlyTarget) {
                          handleTargetUpdate(t._id, e.target.value);
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current: <span className="font-medium text-foreground">{formatCurrency(t.monthlyTarget)}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); reset({ color: '#6366f1', monthlyTarget: 0 }); }} title="New Team">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Team Name" error={errors.name}>
            <Input placeholder="e.g. Sales A, North Region" {...register('name')} />
          </Field>
          <Field label="Description (optional)" error={errors.description}>
            <Input placeholder="What this team does" {...register('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly Target (₹)" error={errors.monthlyTarget}>
              <Input type="number" placeholder="0" {...register('monthlyTarget')} />
            </Field>
            <Field label="Color" error={errors.color}>
              <Input type="color" {...register('color')} className="h-10 cursor-pointer" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset({ color: '#6366f1', monthlyTarget: 0 }); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
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
