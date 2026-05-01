import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Upload, Download } from 'lucide-react';
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
import { exportToExcel } from '@/lib/exportExcel';

/**
 * Frontend schema mirrors the backend — must stay in sync.
 * The dropdown options come from the API (`GET /api/registrations/options`)
 * so adding a new course on the backend automatically shows up here.
 */
const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  course: z.string().min(1, 'Course is required'),
  branch: z.string().min(1, 'Branch is required'),
  entryType: z.string().min(1, 'Entry type is required'),
  university: z.string().min(2, 'University is required'),
  counselorName: z.string().min(2, 'Counselor name is required'),
  date: z.string().min(1, 'Date is required'),
  phone: z.string().optional(),
});

const today = () => new Date().toISOString().split('T')[0];

export const RegistrationsPage = () => {
  const [items, setItems] = useState([]);
  const [options, setOptions] = useState({ courses: [], branches: [], entryTypes: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { date: today(), entryType: 'Counseling' },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, opts] = await Promise.all([
        api.get('/registrations', {
          params: { search, course: courseFilter, limit: 100 },
        }),
        // Cache-friendly: only fetch options on first load
        options.courses.length === 0
          ? api.get('/registrations/options')
          : Promise.resolve({ data: { data: options } }),
      ]);
      setItems(list.data.data);
      if (opts.data.data) setOptions(opts.data.data);
    } catch {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search; refetch on filter change
  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, courseFilter]);

  const onSubmit = async (data) => {
    try {
      await api.post('/registrations', data);
      toast.success('Registration added');
      setOpen(false);
      reset({ date: today(), entryType: 'Counseling' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleExport = () => {
    try {
      const name = exportToExcel({
        filename: 'registrations',
        sheetName: 'Registrations',
        rows: items,
        columns: [
          { header: 'Name', accessor: 'name' },
          { header: 'Course', accessor: 'course' },
          { header: 'Branch', accessor: 'branch' },
          { header: 'Entry Type', accessor: 'entryType' },
          { header: 'University', accessor: 'university' },
          { header: 'Counselor', accessor: 'counselorName' },
          { header: 'Date', accessor: (r) => r.date ? new Date(r.date) : '' },
          { header: 'Phone', accessor: 'phone' },
        ],
      });
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      toast.error(err.message);
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
          <h1 className="text-2xl font-semibold tracking-tight">Registrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Student enrollments and inquiries</p>
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
            New Registration
          </Button>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-4 md:p-6">
          {/* Filters row */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, counselor, or university..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              className="sm:w-48"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <option value="all">All courses</option>
              {options.courses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Entry Type</th>
                  <th className="px-4 py-3 font-medium">University</th>
                  <th className="px-4 py-3 font-medium">Counselor</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No registrations yet</td></tr>
                ) : (
                  items.map((r) => (
                    <tr key={r._id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3"><Badge variant="primary">{r.course}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{r.branch}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.entryType}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.university}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.counselorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); reset({ date: today(), entryType: 'Counseling' }); }}
        title="New Registration"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Student Name" error={errors.name}>
            <Input placeholder="Full name" {...register('name')} />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Course" error={errors.course}>
              <Select {...register('course')}>
                <option value="">Select course...</option>
                {options.courses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Branch / Specialization" error={errors.branch}>
              <Select {...register('branch')}>
                <option value="">Select branch...</option>
                {options.branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Entry Type" error={errors.entryType}>
              <Select {...register('entryType')}>
                {options.entryTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date" error={errors.date}>
              <Input type="date" {...register('date')} />
            </Field>
          </div>

          <Field label="University / College" error={errors.university}>
            <Input placeholder="e.g. Delhi University" {...register('university')} />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Counselor Name" error={errors.counselorName}>
              <Input placeholder="Who handled this?" {...register('counselorName')} />
            </Field>
            <Field label="Phone (optional)" error={errors.phone}>
              <Input placeholder="+91 ..." {...register('phone')} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset({ date: today(), entryType: 'Counseling' }); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        resource="registrations"
        resourceLabel="Registrations"
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
