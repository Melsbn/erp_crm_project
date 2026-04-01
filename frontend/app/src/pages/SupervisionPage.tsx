import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { UserRole, StatutCommande } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Users,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Target,
  Award,
} from 'lucide-react';

export function SupervisionPage() {
  const { t, i18n } = useTranslation();
  const { users, commandes, clients, interactions, factures } = useStore();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'fr-FR';

  const employes = users.filter((u) => u.role === UserRole.EMPLOYE);

  const performanceData = useMemo(() => {
    return employes.map((emp) => {
      const empCommandes = commandes.filter((c) => c.userId === emp.id);
      const empInteractions = interactions.filter((i) => i.userId === emp.id);
      const totalVentes = empCommandes.reduce((sum, c) => sum + c.montantTotal, 0);

      return {
        id: emp.id,
        nom: `${emp.prenom} ${emp.nom}`,
        commandes: empCommandes.length,
        ventes: totalVentes,
        interactions: empInteractions.length,
        clients: new Set(empCommandes.map((c) => c.clientId)).size,
      };
    });
  }, [employes, commandes, interactions]);

  const activityData = [
    { heure: '08:00', actions: 5 },
    { heure: '09:00', actions: 12 },
    { heure: '10:00', actions: 18 },
    { heure: '11:00', actions: 15 },
    { heure: '12:00', actions: 8 },
    { heure: '13:00', actions: 6 },
    { heure: '14:00', actions: 20 },
    { heure: '15:00', actions: 22 },
    { heure: '16:00', actions: 18 },
    { heure: '17:00', actions: 10 },
  ];

  const stats = {
    totalEmployes: employes.length,
    commandesAujourdhui: commandes.filter(
      (c) => new Date(c.dateCommande).toDateString() === new Date().toDateString()
    ).length,
    commandesEnCours: commandes.filter(
      (c) => c.statut === StatutCommande.CONFIRMEE || c.statut === StatutCommande.BROUILLON
    ).length,
    facturesEnAttente: factures.filter((f) => f.statutPaiement === 'EN_ATTENTE').length,
    nouveauxClients: clients.filter(
      (c) => new Date(c.dateCreation).getMonth() === new Date().getMonth()
    ).length,
    interactionsAujourdhui: interactions.filter(
      (i) => new Date(i.date).toDateString() === new Date().toDateString()
    ).length,
  };

  const topPerformers = [...performanceData].sort((a, b) => b.ventes - a.ventes).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('pages.supervision.title')}</h1>
        <p className="text-slate-500">{t('pages.supervision.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.supervision.employees')}</p>
                <p className="text-xl font-bold">{stats.totalEmployes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.supervision.ordersToday')}</p>
                <p className="text-xl font-bold">{stats.commandesAujourdhui}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.supervision.inProgress')}</p>
                <p className="text-xl font-bold">{stats.commandesEnCours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.supervision.invoicesPending')}</p>
                <p className="text-xl font-bold">{stats.facturesEnAttente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.supervision.newClients')}</p>
                <p className="text-xl font-bold">{stats.nouveauxClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100">
                <Activity className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.supervision.interactions')}</p>
                <p className="text-xl font-bold">{stats.interactionsAujourdhui}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">
            <Award className="mr-2 h-4 w-4" />
            {t('common.performance')}
          </TabsTrigger>
          <TabsTrigger value="activite">
            <Activity className="mr-2 h-4 w-4" />
            {t('pages.supervision.activity')}
          </TabsTrigger>
          <TabsTrigger value="classement">
            <TrendingUp className="mr-2 h-4 w-4" />
            {t('pages.supervision.ranking')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('pages.supervision.salesByEmployee')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nom" type="category" width={120} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString(locale)} €`} />
                    <Bar dataKey="ventes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('pages.supervision.ordersByEmployee')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nom" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="commandes" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('pages.supervision.performanceDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.employee')}</TableHead>
                    <TableHead className="text-right">{t('pages.reports.orderCountLabel')}</TableHead>
                    <TableHead className="text-right">{t('pages.supervision.sales')}</TableHead>
                    <TableHead className="text-right">{t('navigation.clients')}</TableHead>
                    <TableHead className="text-right">{t('common.interactions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.nom}</TableCell>
                      <TableCell className="text-right">{emp.commandes}</TableCell>
                      <TableCell className="text-right">{emp.ventes.toLocaleString(locale)} €</TableCell>
                      <TableCell className="text-right">{emp.clients}</TableCell>
                      <TableCell className="text-right">{emp.interactions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('pages.supervision.hourlyActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="heure" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="actions"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('pages.supervision.peakHours')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">14:00 - 15:00</span>
                    <Badge>22 actions</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">15:00 - 16:00</span>
                    <Badge>18 actions</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">10:00 - 11:00</span>
                    <Badge>18 actions</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('pages.supervision.activityByType')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">{t('navigation.orders')}</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      {commandes.filter((c) => new Date(c.dateCommande).toDateString() === new Date().toDateString()).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">{t('common.interactions')}</span>
                    <Badge className="bg-green-100 text-green-700">
                      {interactions.filter((i) => new Date(i.date).toDateString() === new Date().toDateString()).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">{t('pages.supervision.newClients')}</span>
                    <Badge className="bg-purple-100 text-purple-700">
                      {clients.filter((c) => new Date(c.dateCreation).toDateString() === new Date().toDateString()).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('pages.supervision.alerts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.facturesEnAttente > 0 && (
                    <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm">
                        {stats.facturesEnAttente} {t('pages.supervision.awaitingPayment')}
                      </span>
                    </div>
                  )}
                  {stats.commandesEnCours > 0 && (
                    <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">
                        {stats.commandesEnCours} {t('pages.supervision.beingProcessed')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm">
                      {stats.commandesAujourdhui} {t('pages.supervision.validatedToday')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="classement" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {topPerformers.map((performer, index) => (
              <Card key={performer.id} className={index === 0 ? 'border-2 border-yellow-400' : ''}>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-center">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full ${
                        index === 0 ? 'bg-yellow-100' : index === 1 ? 'bg-slate-100' : 'bg-orange-100'
                      }`}
                    >
                      <Award
                        className={`h-8 w-8 ${
                          index === 0 ? 'text-yellow-600' : index === 1 ? 'text-slate-600' : 'text-orange-600'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{performer.nom}</p>
                    <p className="text-sm text-slate-500">#{index + 1}</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t('pages.supervision.sales')}:</span>
                      <span className="font-medium">{performer.ventes.toLocaleString(locale)} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t('navigation.orders')}:</span>
                      <span className="font-medium">{performer.commandes}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t('navigation.clients')}:</span>
                      <span className="font-medium">{performer.clients}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('pages.supervision.completeRanking')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.rank')}</TableHead>
                    <TableHead>{t('common.employee')}</TableHead>
                    <TableHead className="text-right">{t('pages.supervision.sales')}</TableHead>
                    <TableHead className="text-right">{t('navigation.orders')}</TableHead>
                    <TableHead className="text-right">{t('pages.supervision.avgBasket')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...performanceData]
                    .sort((a, b) => b.ventes - a.ventes)
                    .map((emp, index) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          {index === 0 ? (
                            <Badge className="bg-yellow-100 text-yellow-700">{t('pages.supervision.first')}</Badge>
                          ) : index === 1 ? (
                            <Badge className="bg-slate-100 text-slate-700">{t('pages.supervision.second')}</Badge>
                          ) : index === 2 ? (
                            <Badge className="bg-orange-100 text-orange-700">{t('pages.supervision.third')}</Badge>
                          ) : (
                            <span className="text-slate-500">{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{emp.nom}</TableCell>
                        <TableCell className="text-right">{emp.ventes.toLocaleString(locale)} €</TableCell>
                        <TableCell className="text-right">{emp.commandes}</TableCell>
                        <TableCell className="text-right">
                          {emp.commandes > 0 ? Math.round(emp.ventes / emp.commandes).toLocaleString(locale) : 0} €
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
