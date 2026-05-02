import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
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

/**
 * Sidebar — desktop sticky + mobile drawer.
 *
 * Mobile drawer click handling has a subtle catch worth explaining:
 *
 *  - Backdrop (`z-40`) sits behind the drawer. Tapping it must close the drawer.
 *  - Drawer itself (`z-50`) sits in front. Taps inside the drawer (e.g., on a
 *    nav item or the X button) should NOT close the drawer accidentally — the
 *    nav item handles its own close, and X has its own handler.
 *
 * The trick: clicks inside the drawer can bubble up the DOM and reach the
 * backdrop's onClick (depending on stacking and propagation paths in browsers).
 * To prevent any ambiguity, the drawer wrapper calls `e.stopPropagation()` on
 * its own onClick — taps inside never "leak" outside.
 *
 * X button: explicit `onClick={onMobileClose}` AND `e.stopPropagation()` to
 * keep behavior obvious regardless of parent setup.
 */
export const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const user = useAuthStore((s) => s.user);
  const items = navItems.filter((i) => !i.adminOnly || user?.role === 'admin');

  // Helper to close drawer cleanly (used by X button and nav-item taps)
  const handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onMobileClose?.();
  };

  const NavList = ({ showLabels = true, onItemClick }) => (
    <nav className="flex-1 space-y-1 p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onItemClick}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              'hover:bg-accent hover:text-accent-foreground',
              isActive ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-muted-foreground'
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {showLabels && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR — hidden on mobile */}
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
            {!collapsed && (
              <span className="text-base font-semibold tracking-tight">Dashboard Pro</span>
            )}
          </div>
        </div>

        <NavList showLabels={!collapsed} />

        <button
          onClick={onToggle}
          className="m-3 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </motion.aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop — click anywhere outside the drawer to close */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />

            {/* Drawer — stop propagation so taps inside don't bubble to backdrop */}
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-card md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-base font-semibold tracking-tight">Dashboard Pro</span>
                </div>

                {/* X button — explicit handler, stops propagation, prevents default */}
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/70"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <NavList showLabels onItemClick={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};