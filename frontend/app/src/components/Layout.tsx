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
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { ChatbotWidget } from '@/components/ChatbotWidget';


const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN', 'SUPERVISEUR'] },
  { name: 'Utilisateurs', href: '/users', icon: Users, allowedRoles: ['ADMIN', 'SUPERVISEUR'] },
  { name: 'Clients', href: '/clients', icon: UserCircle, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
  { name: 'Prospects', href: '/prospects', icon: UserPlus, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
  { name: 'Produits', href: '/products', icon: Package, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
  { name: 'Commandes', href: '/commandes', icon: ShoppingCart, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
  { name: 'Factures', href: '/factures', icon: FileText, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
  { name: 'Interactions', href: '/interactions', icon: MessageSquare, allowedRoles: ['ADMIN', 'SUPERVISEUR', 'EMPLOYE'] },
  { name: 'Rapports', href: '/rapports', icon: BarChart3, allowedRoles: ['SUPERVISEUR'] },
  { name: 'Supervision', href: '/supervision', icon: Shield, allowedRoles: ['SUPERVISEUR'] },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  
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

  const visibleNavigation = navigation.filter((item) =>
    user?.role ? item.allowedRoles.includes(user.role) : false
  );

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
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ERP</span>
              </div>
              <span className="font-bold text-slate-800">CRM System</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="p-4 space-y-1">
            {visibleNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-slate-200">
              <div className="px-3 py-2 text-xs text-slate-500">
                {user?.email}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={logout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </div>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r border-slate-200">
          <div className="flex items-center gap-2 h-16 px-4 border-b border-slate-200">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ERP</span>
            </div>
            <span className="font-bold text-slate-800">Project</span>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {visibleNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-200">
            <div className="px-3 py-2 text-xs text-slate-500 truncate">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={logout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ERP</span>
            </div>
            <span className="font-bold text-slate-800">Project</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>

        <ChatbotWidget />
      </div>
    </div>
  );
}
