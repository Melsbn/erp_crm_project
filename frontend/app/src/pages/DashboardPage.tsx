import { useMemo } from 'react';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { StatutCommande, StatutPaiement } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  FileText,
  DollarSign,
  Package,
  UserPlus,
  Activity,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardPage() {
  const { user } = useAuth();
  const {
    clients,
    prospects,
    commandes,
    factures,
    produits,
    interactions,
  } = useStore();

  // KPIs
  const kpis = useMemo(() => {
    const totalVentes = commandes.reduce((sum, c) => sum + c.montantTotal, 0);
    const totalClients = clients.length;
    const totalProspects = prospects.length;
    const totalCommandes = commandes.length;
    const commandesEnCours = commandes.filter(
      (c) => c.statut === StatutCommande.CONFIRMEE || c.statut === StatutCommande.BROUILLON
    ).length;
    const facturesEnAttente = factures.filter(
      (f) => f.statutPaiement === StatutPaiement.EN_ATTENTE
    ).length;
    const montantFacturesEnAttente = factures
      .filter((f) => f.statutPaiement === StatutPaiement.EN_ATTENTE)
      .reduce((sum, f) => sum + f.montantTotal, 0);

    return {
      totalVentes,
      totalClients,
      totalProspects,
      totalCommandes,
      commandesEnCours,
      facturesEnAttente,
      montantFacturesEnAttente,
      panierMoyen: totalCommandes > 0 ? totalVentes / totalCommandes : 0,
    };
  }, [clients, prospects, commandes, factures]);

  // Sales by month
  const ventesParMois = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
    return mois.map((m) => ({
      mois: m,
      montant: Math.floor(Math.random() * 10000) + 5000,
      commandes: Math.floor(Math.random() * 20) + 5,
    }));
  }, []);

  // Orders by status
  const commandesParStatut = useMemo(() => {
    const stats = Object.values(StatutCommande).map((statut) => ({
      name: statut,
      value: commandes.filter((c) => c.statut === statut).length,
    }));
    return stats.filter((s) => s.value > 0);
  }, [commandes]);

  // Top products
  const topProduits = useMemo(() => {
    return produits.slice(0, 5).map((p) => ({
      name: p.nom,
      ventes: Math.floor(Math.random() * 50) + 10,
      revenu: p.prix * (Math.floor(Math.random() * 50) + 10),
    }));
  }, [produits]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return interactions
      .slice(-5)
      .reverse()
      .map((i) => ({
        id: i.id,
        type: i.type,
        description: i.description,
        date: new Date(i.date).toLocaleDateString('fr-FR'),
      }));
  }, [interactions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500">
          Bienvenue, {user?.email}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-slate-800">
                  {kpis.totalVentes.toLocaleString('fr-FR')} €
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Clients</p>
                <p className="text-2xl font-bold text-slate-800">{kpis.totalClients}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Commandes</p>
                <p className="text-2xl font-bold text-slate-800">{kpis.totalCommandes}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Panier moyen</p>
                <p className="text-2xl font-bold text-slate-800">
                  {kpis.panierMoyen.toFixed(0)} €
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Prospects</p>
                <p className="text-xl font-bold text-slate-800">{kpis.totalProspects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Commandes en cours</p>
                <p className="text-xl font-bold text-slate-800">{kpis.commandesEnCours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Factures en attente</p>
                <p className="text-xl font-bold text-slate-800">{kpis.facturesEnAttente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes mensuelles</CardTitle>
            <CardDescription>Évolution du chiffre d'affaires</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ventesParMois}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `${value.toLocaleString('fr-FR')} €`}
                />
                <Bar dataKey="montant" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes par statut</CardTitle>
            <CardDescription>Répartition des commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={commandesParStatut}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {commandesParStatut.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {commandesParStatut.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produits populaires</CardTitle>
            <CardDescription>Top 5 des produits les plus vendus</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProduits} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="ventes" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>Dernières interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{activity.type}</p>
                    <p className="text-sm text-slate-500">{activity.description}</p>
                    <p className="text-xs text-slate-400">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
