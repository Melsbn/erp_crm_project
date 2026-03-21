import { useState } from 'react';
import { useStore } from '@/store';
import { InteractionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Phone, Mail, Calendar, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const typeColors: Record<InteractionType, string> = {
  [InteractionType.APPEL]: 'bg-blue-100 text-blue-700',
  [InteractionType.EMAIL]: 'bg-purple-100 text-purple-700',
  [InteractionType.REUNION]: 'bg-green-100 text-green-700',
};

const typeIcons = {
  [InteractionType.APPEL]: Phone,
  [InteractionType.EMAIL]: Mail,
  [InteractionType.REUNION]: Calendar,
};

export function InteractionsPage() {
  const { interactions, clients, prospects, users, addInteraction, deleteInteraction } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'APPEL' as InteractionType,
    description: '',
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    prospecId: '',
  });

  const filteredInteractions = interactions.filter(
    (interaction) =>
      interaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getContactName(interaction).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContactName = (interaction: typeof interactions[0]) => {
    if (interaction.clientId) {
      const client = clients.find((c) => c.id === interaction.clientId);
      return client ? `${client.prenom} ${client.nom}` : 'Client inconnu';
    }
    if (interaction.prospecId) {
      const prospec = prospects.find((p) => p.id === interaction.prospecId);
      return prospec ? `${prospec.prenom} ${prospec.nom}` : 'Prospect inconnu';
    }
    return 'Contact inconnu';
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.prenom} ${user.nom}` : 'Utilisateur inconnu';
  };

  const handleAdd = async () => {
    if (!formData.description) {
      toast.error('Veuillez saisir une description');
      return;
    }

    try {
      await addInteraction({
        type: formData.type,
        description: formData.description,
        date: formData.date,
        userId: '1',
        clientId: formData.clientId || undefined,
        prospecId: formData.prospecId || undefined,
      });

      setIsAddDialogOpen(false);
      setFormData({
        type: InteractionType.APPEL,
        description: '',
        date: new Date().toISOString().split('T')[0],
        clientId: '',
        prospecId: '',
      });
      toast.success('Interaction enregistrée avec succès');
    } catch {
      toast.error("Échec d'enregistrement de l'interaction");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette interaction ?')) {
      try {
        await deleteInteraction(id);
        toast.success('Interaction supprimée avec succès');
      } catch {
        toast.error("Échec de suppression de l'interaction");
      }
    }
  };

  const stats = {
    total: interactions.length,
    appel: interactions.filter((i) => i.type === InteractionType.APPEL).length,
    email: interactions.filter((i) => i.type === InteractionType.EMAIL).length,
    reunion: interactions.filter((i) => i.type === InteractionType.REUNION).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des interactions</h1>
          <p className="text-slate-500">Suivez les communications avec vos clients et prospects</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle interaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enregistrer une interaction</DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle interaction avec un client ou prospect
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type d'interaction</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as InteractionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPEL">Appel téléphonique</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="REUNION">Réunion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Contact</Label>
                <Select
                  value={formData.clientId ? `client:${formData.clientId}` : formData.prospecId ? `prospec:${formData.prospecId}` : undefined}
                  onValueChange={(value) => {
                    const [kind, id] = value.split(':');
                    if (kind === 'client') {
                      setFormData({ ...formData, clientId: id, prospecId: '' });
                    } else {
                      setFormData({ ...formData, prospecId: id, clientId: '' });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label-clients" disabled>Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={`client:${client.id}`}>
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))}
                    <SelectItem value="label-prospects" disabled>Prospects</SelectItem>
                    {prospects.map((prospec) => (
                      <SelectItem key={prospec.id} value={`prospec:${prospec.id}`}>
                        {prospec.prenom} {prospec.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails de l'interaction..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total interactions</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Appels</p>
                <p className="text-xl font-bold">{stats.appel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Emails</p>
                <p className="text-xl font-bold">{stats.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Réunions</p>
                <p className="text-xl font-bold">{stats.reunion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher une interaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Par</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInteractions.map((interaction) => {
                const Icon = typeIcons[interaction.type];
                return (
                  <TableRow key={interaction.id}>
                    <TableCell>
                      <Badge className={typeColors[interaction.type]}>
                        <Icon className="w-3 h-3 mr-1" />
                        {interaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{getContactName(interaction)}</TableCell>
                    <TableCell className="max-w-xs truncate">{interaction.description}</TableCell>
                    <TableCell>
                      {new Date(interaction.date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>{getUserName(interaction.userId)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(interaction.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


