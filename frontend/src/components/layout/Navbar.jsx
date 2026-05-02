import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export const Navbar = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Hamburger menu — visible only on mobile */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 transition-colors hover:bg-accent md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-9 bg-secondary/50 border-transparent focus-visible:bg-background"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 transition-colors hover:bg-accent"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-md p-2 transition-colors hover:bg-accent"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-soft"
              >
                <div className="border-b border-border p-4">
                  <p className="font-medium">Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  <div className="rounded-lg p-3 text-sm text-muted-foreground">
                    No new notifications
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative ml-2" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-full p-1 pr-3 transition-colors",
              "hover:bg-accent",
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="hidden text-sm font-medium md:inline">
              {user?.name?.split(" ")[0]}
            </span>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-soft"
              >
                <div className="border-b border-border p-3">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {user?.role}
                  </span>
                </div>
                <div className="p-1">
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
                    <UserIcon className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
