import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, GraduationCap, Wallet } from 'lucide-react';

import api from '@/services/api';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { RevenueByTeam } from '@/components/dashboard/RevenueByTeam';
import { ThisMonthLists } from '@/components/dashboard/ThisMonthLists';
import { TeamPerformanceChart } from '@/components/dashboard/TeamPerformanceChart';
import { formatCurrency, formatNumber } from '@/lib/utils';

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
];

export const DashboardPage = () => {
  const [range, setRange] = useState('thisMonth');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: res } = await api.get(`/dashboard?range=${range}`);
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error('Dashboard fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [range]);

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Header — matches sketch: title left, range filter top-right */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time view of your registrations, admissions and collections
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Row 1 — 4 KPI Cards (exactly as sketch) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Employees"
          value={formatNumber(kpis.totalEmployees)}
          subtitle="Across all teams"
          icon={Users}
          color="primary"
          loading={loading}
          delay={0}
        />
        <KpiCard
          label="Total Register"
          value={formatNumber(kpis.totalRegister)}
          subtitle="This month"
          icon={UserPlus}
          color="emerald"
          loading={loading}
          delay={0.05}
        />
        <KpiCard
          label="Total Admission"
          value={formatNumber(kpis.totalAdmission)}
          subtitle="This month"
          icon={GraduationCap}
          color="amber"
          loading={loading}
          delay={0.1}
        />
        <KpiCard
          label="Total Collection"
          value={formatCurrency(kpis.totalCollection)}
          subtitle="This month"
          icon={Wallet}
          color="rose"
          loading={loading}
          delay={0.15}
        />
      </div>

      {/* Row 2 — Revenue by Team | Admission/Register This Month split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueByTeam data={data?.revenueByTeam} loading={loading} />
        <ThisMonthLists
          admissions={data?.recentAdmissions || []}
          registrations={data?.recentRegistrations || []}
          loading={loading}
        />
      </div>

      {/* Row 3 — full-width Team Performance vs Target */}
      <TeamPerformanceChart data={data?.teamPerformance} loading={loading} />
    </div>
  );
};
