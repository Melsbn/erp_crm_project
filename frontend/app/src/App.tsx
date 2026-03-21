import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { ProspectsPage } from '@/pages/ProspectsPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { CommandesPage } from '@/pages/CommandesPage';
import { FacturesPage } from '@/pages/FacturesPage';
import { InteractionsPage } from '@/pages/InteractionsPage';
import { RapportsPage } from '@/pages/RapportsPage';
import { SupervisionPage } from '@/pages/SupervisionPage';
import { Toaster } from '@/components/ui/sonner';

function HomeRedirect() {
  const { user } = useAuth();

  if (user?.role === 'EMPLOYE') {
    return <Navigate to="/clients" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function LoginRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    if (user?.role === 'EMPLOYE') {
      return <Navigate to="/clients" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>

  {/* LOGIN */}
  <Route path="/login" element={<LoginRedirect />} />

  {/* MAIN LAYOUT */}
  <Route
    path="/"
    element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }
  >

    {/* HOME REDIRECT */}
    <Route
      index
      element={<HomeRedirect />}
    />

    {/* DASHBOARD */}
    <Route
      path="dashboard"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR"]}>
          <DashboardPage />
        </ProtectedRoute>
      }
    />

    {/* USERS */}
    <Route
      path="users"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR"]}>
          <UsersPage />
        </ProtectedRoute>
      }
    />

    {/* SUPERVISION */}
    <Route
      path="supervision"
      element={
        <ProtectedRoute allowedRoles={["SUPERVISEUR"]}>
          <SupervisionPage />
        </ProtectedRoute>
      }
    />

    {/* CLIENTS */}
    <Route
      path="clients"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR","EMPLOYE"]}>
          <ClientsPage />
        </ProtectedRoute>
      }
    />

    {/* PROSPECTS */}
    <Route
      path="prospects"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR","EMPLOYE"]}>
          <ProspectsPage />
        </ProtectedRoute>
      }
    />

    {/* PRODUCTS */}
    <Route
      path="products"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR","EMPLOYE"]}>
          <ProductsPage />
        </ProtectedRoute>
      }
    />

    {/* COMMANDES */}
    <Route
      path="commandes"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR","EMPLOYE"]}>
          <CommandesPage />
        </ProtectedRoute>
      }
    />

    {/* FACTURES */}
    <Route
      path="factures"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR","EMPLOYE"]}>
          <FacturesPage />
        </ProtectedRoute>
      }
    />

    {/* INTERACTIONS */}
    <Route
      path="interactions"
      element={
        <ProtectedRoute allowedRoles={["ADMIN","SUPERVISEUR","EMPLOYE"]}>
          <InteractionsPage />
        </ProtectedRoute>
      }
    />

    {/* RAPPORTS */}
    <Route
      path="rapports"
      element={
        <ProtectedRoute allowedRoles={["SUPERVISEUR"]}>
          <RapportsPage />
        </ProtectedRoute>
      }
    />

  </Route>

  {/* DEFAULT */}
  <Route path="*" element={<Navigate to="/" replace />} />

</Routes>

        <Toaster />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
