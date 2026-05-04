import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/registrations", icon: UserPlus, label: "Registrations" },
  { to: "/admissions", icon: GraduationCap, label: "Admissions" },
  { to: "/collections", icon: Wallet, label: "Collections" },
  { to: "/employees", icon: Users, label: "Employees" },
  { to: "/teams", icon: Building2, label: "Teams", adminOnly: true },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const user = useAuthStore((s) => s.user);
  const items = navItems.filter((i) => !i.adminOnly || user?.role === "admin");

  // DEBUG: log to console when component renders
  console.log("[Sidebar] render", {
    mobileOpen,
    hasOnMobileClose: typeof onMobileClose,
  });

  const handleClose = () => {
    console.log("[Sidebar] handleClose called, calling onMobileClose...");
    if (typeof onMobileClose === "function") {
      onMobileClose();
      console.log("[Sidebar] onMobileClose() executed");
    } else {
      console.error(
        "[Sidebar] onMobileClose is NOT a function:",
        onMobileClose,
      );
    }
  };

  const NavList = ({ showLabels = true, onItemClick }) => (
    <nav className="flex-1 space-y-1 p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onItemClick}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              "hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "text-muted-foreground",
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
      {/* DESKTOP SIDEBAR */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="sticky top-0 z-30 hidden h-screen flex-col border-r border-border bg-card md:flex"
      >
        <div className="flex h-16 items-center border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            {!collapsed && (
              <span className="text-base font-semibold tracking-tight">
                Dashboard Pro
              </span>
            )}
          </div>
        </div>

        <NavList showLabels={!collapsed} />

        <button
          onClick={onToggle}
          className="m-3 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </motion.aside>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                console.log("[Sidebar] backdrop clicked");
                handleClose();
              }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              aria-hidden="true"
            />

            <motion.aside
              key="sidebar-drawer"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-card md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-base font-semibold tracking-tight">
                    Dashboard Pro
                  </span>
                </div>

                {/* X button — debug logs added */}
                <button
                  type="button"
                  onClick={(e) => {
                    console.log("[Sidebar] X button onClick fired");
                    e.preventDefault();
                    e.stopPropagation();
                    handleClose();
                  }}
                  onPointerDown={() =>
                    console.log("[Sidebar] X button pointerDown")
                  }
                  className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/70"
                  aria-label="Close menu"
                  style={{ touchAction: "manipulation" }}
                >
                  <X className="h-5 w-5 pointer-events-none" />
                </button>
              </div>

              <NavList showLabels onItemClick={handleClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
