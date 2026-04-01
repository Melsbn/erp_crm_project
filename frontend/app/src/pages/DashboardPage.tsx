import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const {
    clients,
    prospects,
    commandes,
    factures,
    produits,
    interactions,
  } = useStore();

  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'fr-FR';

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

    return {
      totalVentes,
      totalClients,
      totalProspects,
      totalCommandes,
      commandesEnCours,
      facturesEnAttente,
      panierMoyen: totalCommandes > 0 ? totalVentes / totalCommandes : 0,
    };
  }, [clients, prospects, commandes, factures]);

  const ventesParMois = useMemo(() => {
    const mois = locale === 'en-US'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      : ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];

    return mois.map((m) => ({
      mois: m,
      montant: Math.floor(Math.random() * 10000) + 5000,
      commandes: Math.floor(Math.random() * 20) + 5,
    }));
  }, [locale]);

  const commandesParStatut = useMemo(() => {
    const stats = Object.values(StatutCommande).map((statut) => ({
      name: statut,
      value: commandes.filter((c) => c.statut === statut).length,
    }));
    return stats.filter((s) => s.value > 0);
  }, [commandes]);

  const topProduits = useMemo(() => {
    return produits.slice(0, 5).map((p) => ({
      name: p.nom,
      ventes: Math.floor(Math.random() * 50) + 10,
      revenu: p.prix * (Math.floor(Math.random() * 50) + 10),
    }));
  }, [produits]);

  const recentActivity = useMemo(() => {
    return interactions
      .slice(-5)
      .reverse()
      .map((i) => ({
        id: i.id,
        type: i.type,
        description: i.description,
        date: new Date(i.date).toLocaleDateString(locale),
      }));
  }, [interactions, locale]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('pages.dashboard.title')}</h1>
        <p className="text-slate-500">{t('pages.dashboard.welcome', { email: user?.email ?? '' })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('pages.dashboard.revenue')}</p>
                <p className="text-2xl font-bold text-slate-800">
                  {kpis.totalVentes.toLocaleString(locale)} €
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('navigation.clients')}</p>
                <p className="text-2xl font-bold text-slate-800">{kpis.totalClients}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('pages.dashboard.orders')}</p>
                <p className="text-2xl font-bold text-slate-800">{kpis.totalCommandes}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{t('pages.dashboard.avgBasket')}</p>
                <p className="text-2xl font-bold text-slate-800">
                  {kpis.panierMoyen.toFixed(0)} €
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <UserPlus className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{t('pages.dashboard.prospects')}</p>
                <p className="text-xl font-bold text-slate-800">{kpis.totalProspects}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{t('pages.dashboard.ongoingOrders')}</p>
                <p className="text-xl font-bold text-slate-800">{kpis.commandesEnCours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{t('pages.dashboard.pendingInvoices')}</p>
                <p className="text-xl font-bold text-slate-800">{kpis.facturesEnAttente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('pages.dashboard.monthlySales')}</CardTitle>
            <CardDescription>{t('pages.dashboard.salesTrend')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ventesParMois}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toLocaleString(locale)} €`} />
                <Bar dataKey="montant" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('pages.dashboard.ordersByStatus')}</CardTitle>
            <CardDescription>{t('pages.dashboard.orderBreakdown')}</CardDescription>
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
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {commandesParStatut.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-slate-600">{t(`statusLabels.order.${item.name}`)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('pages.dashboard.popularProducts')}</CardTitle>
            <CardDescription>{t('pages.dashboard.topProducts')}</CardDescription>
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
            <CardTitle>{t('pages.dashboard.recentActivity')}</CardTitle>
            <CardDescription>{t('pages.dashboard.latestInteractions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {t(`statusLabels.interaction.${activity.type}`)}
                    </p>
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
