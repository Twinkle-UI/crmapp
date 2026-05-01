import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  Wallet,
  Users,
  Building2,
  Settings,
  ChevronLeft,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/registrations', icon: UserPlus, label: 'Registrations' },
  { to: '/admissions', icon: GraduationCap, label: 'Admissions' },
  { to: '/collections', icon: Wallet, label: 'Collections' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/teams', icon: Building2, label: 'Teams', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = ({ collapsed, onToggle }) => {
  const user = useAuthStore((s) => s.user);
  const items = navItems.filter((i) => !i.adminOnly || user?.role === 'admin');

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="sticky top-0 z-30 hidden h-screen flex-col border-r border-border bg-card md:flex"
    >
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          {!collapsed && <span className="text-base font-semibold tracking-tight">Dashboard Pro</span>}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                'hover:bg-accent hover:text-accent-foreground',
                isActive ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="m-3 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </motion.aside>
  );
};
