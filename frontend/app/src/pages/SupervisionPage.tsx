import { useMemo } from 'react';
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
  const { users, commandes, clients, interactions, factures } = useStore();

  const employes = users.filter((u) => u.role === UserRole.EMPLOYE);

  // Employee performance data
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

  // Activity timeline
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

  // Global stats
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

  // Top performers
  const topPerformers = [...performanceData]
    .sort((a, b) => b.ventes - a.ventes)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Supervision et contrôle</h1>
        <p className="text-slate-500">Suivez les performances et l'activité de votre équipe</p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Employés</p>
                <p className="text-xl font-bold">{stats.totalEmployes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Commandes aujourd'hui</p>
                <p className="text-xl font-bold">{stats.commandesAujourdhui}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">En cours</p>
                <p className="text-xl font-bold">{stats.commandesEnCours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Factures attente</p>
                <p className="text-xl font-bold">{stats.facturesEnAttente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Nouveaux clients</p>
                <p className="text-xl font-bold">{stats.nouveauxClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Interactions</p>
                <p className="text-xl font-bold">{stats.interactionsAujourdhui}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">
            <Award className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="activite">
            <Activity className="w-4 h-4 mr-2" />
            Activité
          </TabsTrigger>
          <TabsTrigger value="classement">
            <TrendingUp className="w-4 h-4 mr-2" />
            Classement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventes par employé</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nom" type="category" width={120} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR')} €`} />
                    <Bar dataKey="ventes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commandes par employé</CardTitle>
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
              <CardTitle>Détail des performances</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                    <TableHead className="text-right">Interactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.nom}</TableCell>
                      <TableCell className="text-right">{emp.commandes}</TableCell>
                      <TableCell className="text-right">
                        {emp.ventes.toLocaleString('fr-FR')} €
                      </TableCell>
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
              <CardTitle>Activité horaire</CardTitle>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Heures de pointe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">14:00 - 15:00</span>
                    <Badge>22 actions</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">15:00 - 16:00</span>
                    <Badge>18 actions</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">10:00 - 11:00</span>
                    <Badge>18 actions</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activité par type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">Commandes</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      {commandes.filter((c) => new Date(c.dateCommande).toDateString() === new Date().toDateString()).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">Interactions</span>
                    <Badge className="bg-green-100 text-green-700">
                      {interactions.filter((i) => new Date(i.date).toDateString() === new Date().toDateString()).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">Nouveaux clients</span>
                    <Badge className="bg-purple-100 text-purple-700">
                      {clients.filter((c) => new Date(c.dateCreation).toDateString() === new Date().toDateString()).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.facturesEnAttente > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm">
                        {stats.facturesEnAttente} factures en attente de paiement
                      </span>
                    </div>
                  )}
                  {stats.commandesEnCours > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm">
                        {stats.commandesEnCours} commandes en cours de traitement
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm">
                      {stats.commandesAujourdhui} commandes validées aujourd'hui
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="classement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topPerformers.map((performer, index) => (
              <Card key={performer.id} className={index === 0 ? 'border-yellow-400 border-2' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        index === 0
                          ? 'bg-yellow-100'
                          : index === 1
                          ? 'bg-slate-100'
                          : 'bg-orange-100'
                      }`}
                    >
                      <Award
                        className={`w-8 h-8 ${
                          index === 0
                            ? 'text-yellow-600'
                            : index === 1
                            ? 'text-slate-600'
                            : 'text-orange-600'
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
                      <span className="text-slate-500">Ventes:</span>
                      <span className="font-medium">
                        {performer.ventes.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Commandes:</span>
                      <span className="font-medium">{performer.commandes}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Clients:</span>
                      <span className="font-medium">{performer.clients}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Classement complet</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead className="text-right">Panier moyen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...performanceData]
                    .sort((a, b) => b.ventes - a.ventes)
                    .map((emp, index) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          {index === 0 ? (
                            <Badge className="bg-yellow-100 text-yellow-700">1er</Badge>
                          ) : index === 1 ? (
                            <Badge className="bg-slate-100 text-slate-700">2ème</Badge>
                          ) : index === 2 ? (
                            <Badge className="bg-orange-100 text-orange-700">3ème</Badge>
                          ) : (
                            <span className="text-slate-500">{index + 1}ème</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{emp.nom}</TableCell>
                        <TableCell className="text-right">
                          {emp.ventes.toLocaleString('fr-FR')} €
                        </TableCell>
                        <TableCell className="text-right">{emp.commandes}</TableCell>
                        <TableCell className="text-right">
                          {emp.commandes > 0
                            ? Math.round(emp.ventes / emp.commandes).toLocaleString('fr-FR')
                            : 0} €
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
