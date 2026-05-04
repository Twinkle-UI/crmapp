import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  User as UserIcon,
  Bell,
  Shield,
  UsersRound,
  Plus,
  Trash2,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

import api from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/**
 * SettingsPage — tabbed settings.
 *
 * Tabs split because shoving everything into one long page makes it harder
 * to find what you're looking for. Tabs are kept as URL-less local state
 * since these are within the same logical "settings" area — deep-linking
 * to specific tabs isn't a common need here.
 */
const TABS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "users", label: "Users", icon: UsersRound, adminOnly: true },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

export const SettingsPage = () => {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState("profile");

  // Hide admin-only tabs for non-admins so they don't see things they can't use
  const visibleTabs = TABS.filter(
    (t) => !t.adminOnly || user?.role === "admin",
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, users, and preferences
        </p>
      </motion.div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tab navigation — vertical on desktop, horizontal scroll on mobile */}
        <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:gap-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "lg:w-full lg:justify-start",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && <ProfileTab user={user} />}
          {activeTab === "users" && user?.role === "admin" && (
            <UsersTab currentUser={user} />
          )}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "notifications" && (
            <ComingSoonTab
              title="Notifications"
              message="Notification preferences coming soon."
              icon={Bell}
            />
          )}
          {activeTab === "security" && (
            <ComingSoonTab
              title="Security"
              message="Password change flow coming soon."
              icon={Shield}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PROFILE TAB
// ============================================================

const ProfileTab = ({ user }) => (
  <Card>
    <CardHeader>
      <CardTitle>Profile</CardTitle>
      <CardDescription>Your account information</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>
      <div className="rounded-lg bg-muted/30 p-3 text-sm">
        <span className="text-muted-foreground">Role: </span>
        <span className="font-medium capitalize">{user?.role}</span>
      </div>
    </CardContent>
  </Card>
);

// ============================================================
// USERS TAB — admin manages staff accounts
// ============================================================

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]),
});

/**
 * UsersTab — full CRUD for users.
 *
 * Why we render password in plaintext on creation:
 *  - The admin sets the password and shares it manually with the user
 *    (via WhatsApp/email/in-person)
 *  - There's no email service wired up to auto-send credentials
 *  - We could ask the admin to type the password and just trust them, but
 *    showing the generated password in a "Created!" dialog gives them
 *    something to copy. They paste it into WhatsApp once and move on.
 */
const UsersTab = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState(null); // for "share these credentials" dialog

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "user" },
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setUsers(data.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Random secure-ish password — not crypto-grade but good enough for an
  // initial password the user will (hopefully) change later.
  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    for (let i = 0; i < 10; i++)
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setValue("password", pwd, { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    try {
      const { data: res } = await api.post("/users", data);
      // Hold onto the plaintext password so admin can copy + share
      setCreatedUser({ ...res.data, plainPassword: data.password });
      setOpen(false);
      reset({ role: "user" });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    }
  };

  const handleDelete = async (u) => {
    if (
      !window.confirm(
        `Delete user "${u.name}"? They will lose access immediately.`,
      )
    )
      return;
    try {
      await api.delete(`/users/${u._id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-muted-foreground" />
            Users
          </CardTitle>
          <CardDescription>
            Manage who can sign in to the dashboard
          </CardDescription>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No users yet
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isMe = String(u._id) === String(currentUser._id);
                  return (
                    <tr
                      key={u._id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium">
                        {u.name}
                        {isMe && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={u.role === "admin" ? "primary" : "secondary"}
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isMe}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                          title={isMe ? "Can't delete yourself" : "Delete user"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Add User dialog */}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset({ role: "user" });
        }}
        title="Add New User"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Full Name" error={errors.name}>
            <Input placeholder="e.g. Priya Sharma" {...register("name")} />
          </Field>

          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              placeholder="user@example.com"
              {...register("email")}
            />
          </Field>

          <Field label="Password" error={errors.password}>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Min 6 characters"
                {...register("password")}
                className="flex-1 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                title="Generate random password"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              You'll see this password once after creation — copy it then share
              with the user.
            </p>
          </Field>

          <Field label="Role" error={errors.role}>
            <Select {...register("role")}>
              <option value="user">User — can manage data</option>
              <option value="admin">Admin — full access</option>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset({ role: "user" });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials display dialog after successful creation */}
      <Modal
        open={!!createdUser}
        onClose={() => setCreatedUser(null)}
        title="User Created — Share These Credentials"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              ⚠️ Save this password now — it won't be shown again.
            </p>
            <p className="mt-1 text-amber-800/80 dark:text-amber-200/80">
              Share these credentials with the user via WhatsApp, email, or in
              person.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 font-mono text-sm">
            <CopyRow label="Email" value={createdUser?.email} />
            <CopyRow label="Password" value={createdUser?.plainPassword} />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setCreatedUser(null)}>Done</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

const CopyRow = ({ label, value }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="flex-1 truncate font-medium">{value}</span>
      <button
        onClick={handleCopy}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title={`Copy ${label}`}
      >
        <KeyRound className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ============================================================
// APPEARANCE TAB
// ============================================================

const AppearanceTab = () => {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how the app looks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Dark mode</p>
            <p className="text-xs text-muted-foreground">
              Toggle between light and dark themes
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative h-6 w-11 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                theme === "dark" ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================
// "Coming Soon" placeholder tab
// ============================================================

const ComingSoonTab = ({ title, message, icon: Icon }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <CardTitle>{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{message}</p>
    </CardContent>
  </Card>
);

// ============================================================
// Reusable form Field
// ============================================================

const Field = ({ label, error, children }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium">{label}</label>
    {children}
    {error && <p className="text-xs text-destructive">{error.message}</p>}
  </div>
);
