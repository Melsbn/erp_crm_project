import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import type { ProfileUser } from '@/services/api';
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
import type { LucideIcon } from 'lucide-react';

const COLORS = ['#0ea5e9', '#64748b', '#14b8a6', '#f59e0b', '#94a3b8'];
const CHART_GRID = '#e2e8f0';
const SALES_STATUSES = new Set<StatutCommande>([StatutCommande.CONFIRMEE, StatutCommande.LIVREE]);

type UserWithName = {
  nom?: string;
  prenom?: string;
};

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName: string;
  compact?: boolean;
}

function MetricCard({ label, value, icon: Icon, iconClassName, compact = false }: MetricCardProps) {
  return (
    <Card className="dashboard-card gap-0 py-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={compact ? 'mt-1 text-xl font-semibold text-slate-800' : 'mt-2 text-2xl font-semibold text-slate-800'}>
              {value}
            </p>
          </div>
          <div className={compact ? 'dashboard-icon dashboard-icon-sm' : 'dashboard-icon'}>
            <Icon className={compact ? `h-4 w-4 ${iconClassName}` : `h-5 w-5 ${iconClassName}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const namedUser = user as (typeof user & UserWithName);
  const userFirstName = namedUser?.prenom;
  const userLastName = namedUser?.nom;
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const {
    clients,
    prospects,
    commandes,
    factures,
    produits,
    lignesCommande,
    interactions,
  } = useStore();

  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'fr-FR';
  const userDisplayName = [userFirstName ?? profile?.prenom, userLastName ?? profile?.nom]
    .filter(Boolean)
    .join(' ') || user?.email || '';

  useEffect(() => {
    if (!user || userFirstName || userLastName) return;

    const fetchProfile = async () => {
      try {
        setProfile(await api.getProfile());
      } catch {
        setProfile(null);
      }
    };

    fetchProfile();
  }, [user, userFirstName, userLastName]);

  const kpis = useMemo(() => {
    const salesOrders = commandes.filter((c) => SALES_STATUSES.has(c.statut));
    const totalVentes = salesOrders.reduce((sum, c) => sum + c.montantTotal, 0);
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
      panierMoyen: salesOrders.length > 0 ? totalVentes / salesOrders.length : 0,
    };
  }, [clients, prospects, commandes, factures]);

  const ventesParMois = useMemo(() => {
    const mois = locale === 'en-US'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const months = mois.map((m) => ({ mois: m, montant: 0, commandes: 0 }));

    commandes
      .filter((commande) => SALES_STATUSES.has(commande.statut))
      .forEach((commande) => {
        const date = new Date(commande.dateCommande);
        if (date.getFullYear() !== currentYear) return;

        const bucket = months[date.getMonth()];
        bucket.montant += commande.montantTotal;
        bucket.commandes += 1;
      });

    return months;
  }, [commandes, locale]);

  const commandesParStatut = useMemo(() => {
    const stats = Object.values(StatutCommande).map((statut) => ({
      name: statut,
      value: commandes.filter((c) => c.statut === statut).length,
    }));
    return stats.filter((s) => s.value > 0);
  }, [commandes]);

  const topProduits = useMemo(() => {
    const salesOrderIds = new Set(
      commandes
        .filter((commande) => SALES_STATUSES.has(commande.statut))
        .map((commande) => commande.id)
    );
    const productNames = new Map(produits.map((produit) => [produit.id, produit.nom]));
    const totals = new Map<string, { name: string; ventes: number; revenu: number }>();

    lignesCommande
      .filter((ligne) => salesOrderIds.has(ligne.commandeId))
      .forEach((ligne) => {
        const current = totals.get(ligne.produitId) ?? {
          name: productNames.get(ligne.produitId) ?? ligne.produitId,
          ventes: 0,
          revenu: 0,
        };
        current.ventes += ligne.quantite;
        current.revenu += ligne.sousTotal;
        totals.set(ligne.produitId, current);
      });

    return Array.from(totals.values())
      .sort((a, b) => b.ventes - a.ventes)
      .slice(0, 5);
  }, [commandes, lignesCommande, produits]);

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800">{t('pages.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('pages.dashboard.welcome', { name: userDisplayName })}
        </p>
      </div>

      <div className="dashboard-card-grid grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t('pages.dashboard.revenue')}
          value={`${kpis.totalVentes.toLocaleString(locale)} €`}
          icon={DollarSign}
          iconClassName="text-sky-600"
        />
        <MetricCard
          label={t('navigation.clients')}
          value={kpis.totalClients}
          icon={Users}
          iconClassName="text-teal-600"
        />
        <MetricCard
          label={t('pages.dashboard.orders')}
          value={kpis.totalCommandes}
          icon={ShoppingCart}
          iconClassName="text-slate-600"
        />
        <MetricCard
          label={t('pages.dashboard.avgBasket')}
          value={`${kpis.panierMoyen.toFixed(0)} €`}
          icon={TrendingUp}
          iconClassName="text-amber-600"
        />
      </div>

      <div className="dashboard-card-grid grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard
          label={t('pages.dashboard.prospects')}
          value={kpis.totalProspects}
          icon={UserPlus}
          iconClassName="text-amber-600"
          compact
        />
        <MetricCard
          label={t('pages.dashboard.ongoingOrders')}
          value={kpis.commandesEnCours}
          icon={Package}
          iconClassName="text-sky-600"
          compact
        />
        <MetricCard
          label={t('pages.dashboard.pendingInvoices')}
          value={kpis.facturesEnAttente}
          icon={FileText}
          iconClassName="text-rose-600"
          compact
        />
      </div>

      <div className="dashboard-card-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dashboard-card gap-0 py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base font-semibold">{t('pages.dashboard.monthlySales')}</CardTitle>
            <CardDescription>{t('pages.dashboard.salesTrend')}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ventesParMois}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString(locale)} €`} />
                <Bar dataKey="montant" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dashboard-card gap-0 py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base font-semibold">{t('pages.dashboard.ordersByStatus')}</CardTitle>
            <CardDescription>{t('pages.dashboard.orderBreakdown')}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={commandesParStatut}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {commandesParStatut.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {commandesParStatut.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-slate-600">{t(`statusLabels.order.${item.name}`)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="dashboard-card-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dashboard-card gap-0 py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base font-semibold">{t('pages.dashboard.popularProducts')}</CardTitle>
            <CardDescription>{t('pages.dashboard.topProducts')}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={topProduits} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="ventes" fill="#14b8a6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dashboard-card gap-0 py-0">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base font-semibold">{t('pages.dashboard.recentActivity')}</CardTitle>
            <CardDescription>{t('pages.dashboard.latestInteractions')}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="dashboard-icon dashboard-icon-xs flex-shrink-0">
                    <Activity className="h-3.5 w-3.5 text-sky-600" />
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
