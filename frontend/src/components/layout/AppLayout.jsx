import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

/**
 * AppLayout — wraps every authenticated page with sidebar + navbar.
 *
 * Two responsive behaviors managed here:
 *  - `collapsed` (desktop only): user can shrink sidebar to icon-only mode
 *  - `mobileOpen`: on phones the sidebar is fully hidden by default; a hamburger
 *     in the navbar opens it as a drawer with backdrop. We reset this on every
 *     route change so the drawer auto-closes after navigation.
 */
export const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer whenever the URL changes (e.g. user taps a nav item)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
