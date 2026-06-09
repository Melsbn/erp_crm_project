import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  UserPlus,
  Package,
  ShoppingCart,
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  Menu,
  X,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { ChatbotWidget } from '@/components/ChatbotWidget';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import type { ProfileUser } from '@/services/api';
import { toast } from 'sonner';

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden">
        <img
          src="/octopus-logo.png"
          alt="octuplus logo"
          className="h-8 w-8 object-contain"
        />
      </div>
      <span className="text-base font-bold tracking-tight">
        <span className="text-slate-600 dark:text-slate-300">Octu</span>
        <span className="text-sky-500 dark:text-sky-400">plus</span>
      </span>
    </div>
  );
}

function ProfileDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!open) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        setProfile(await api.getProfile());
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [open]);

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      resetPasswordForm();
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = [profile?.prenom, profile?.nom].filter(Boolean).join(' ') || 'User profile';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Open profile"
        >
          <UserCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>My profile</DialogTitle>
          <DialogDescription>View your account details and update your password.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <UserCircle className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isLoading ? 'Loading...' : displayName}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {profile?.email ?? user?.email}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {profile?.role ?? user?.role}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {profile?.actif === false ? 'Inactive' : 'Active'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <KeyRound className="h-4 w-4" />
              Change password
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-current-password">Current password</Label>
              <Input
                id="profile-current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm({ ...passwordForm, currentPassword: event.target.value })
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-new-password">New password</Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, newPassword: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-confirm-password">Confirm password</Label>
                <Input
                  id="profile-confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={handleChangePassword}
            disabled={
              isSaving ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              !passwordForm.confirmPassword
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Saving...' : 'Save password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  
  // Add this block to fetch all data on app load
  const {
    fetchUsers,
    fetchClients,
    fetchProspects,
    fetchProducts,
    fetchCategories,
    fetchOrders,
    fetchInvoices,
    fetchInteractions,
    fetchReports
  } = useStore();

  const navigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN', 'SUPERVISEUR'] },
    { name: t('navigation.users'), href: '/users', icon: Users, allowedRoles: ['ADMIN', 'SUPERVISEUR'] },
    { name: t('navigation.clients'), href: '/clients', icon: UserCircle, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
    { name: t('navigation.prospects'), href: '/prospects', icon: UserPlus, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
    { name: t('navigation.products'), href: '/products', icon: Package, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
    { name: t('navigation.orders'), href: '/commandes', icon: ShoppingCart, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
    { name: t('navigation.invoices'), href: '/factures', icon: FileText, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
    { name: t('navigation.interactions'), href: '/interactions', icon: MessageSquare, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
    { name: t('navigation.reports'), href: '/rapports', icon: BarChart3, allowedRoles: ['SUPERVISEUR'] },
    { name: t('navigation.supervision'), href: '/supervision', icon: Shield, allowedRoles: ['SUPERVISEUR'] },
  ];

  const visibleNavigation = navigation.filter((item) =>
    user?.role ? item.allowedRoles.includes(user.role) : false
  );
  const activeNavigationItem = visibleNavigation.find((item) => item.href === location.pathname);

  useEffect(() => {
    // Fetch data allowed for the current role.
    if (user?.role === 'ADMIN' || user?.role === 'SUPERVISEUR') {
      fetchUsers();
    }
    fetchClients();
    fetchProspects();
    fetchProducts();
    fetchCategories();
    fetchOrders();
    fetchInvoices();
    fetchInteractions();
    if (user?.role === 'SUPERVISEUR') {
      fetchReports();
    }
  }, [
    user?.role,
    fetchUsers,
    fetchClients,
    fetchProspects,
    fetchProducts,
    fetchCategories,
    fetchOrders,
    fetchInvoices,
    fetchInteractions,
    fetchReports,
  ]);

  return (
    <div className="app-shell min-h-screen">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} />
        <div className="mobile-drawer fixed inset-y-0 left-0 w-72 border-r border-slate-200 bg-[#fbfaf7] shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <BrandMark />
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="p-4 space-y-1.5">
            {visibleNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                  location.pathname === item.href
                    ? 'nav-link-active'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {user?.email}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                  {user?.role}
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                onClick={logout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                {t('layout.logout')}
              </Button>
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col border-r border-slate-200 bg-[#fbfaf7]/95 dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex h-20 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
            <BrandMark />
          </div>
          <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
            {visibleNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                  location.pathname === item.href
                    ? 'nav-link-active'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                {user?.role}
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
              onClick={logout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              {t('layout.logout')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="hidden h-20 items-center justify-between border-b border-slate-200 bg-white/78 px-8 backdrop-blur dark:border-slate-800 dark:bg-slate-950/78 lg:flex">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
              {activeNavigationItem?.name ?? 'octuplus'}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Signed in as {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <ProfileDialog />
          </div>
        </div>
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 lg:hidden">
          <BrandMark />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <ProfileDialog />
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main key={location.pathname} className="page-settle p-4 lg:p-8">
          <Outlet />
        </main>

        <ChatbotWidget />
      </div>
    </div>
  );
}
