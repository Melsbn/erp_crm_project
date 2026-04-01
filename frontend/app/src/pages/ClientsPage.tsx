import { useState } from 'react';
import { useStore } from '@/store';
import { ClientType } from '@/types';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit2, Trash2, Building2, User, History, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function ClientsPage() {
  const { t } = useTranslation();
  const { clients, commandes, interactions, addClient, updateClient, deleteClient } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<typeof clients[0] | null>(null);

  const getClientTypeLabel = (type: ClientType) => t(`statusLabels.clientType.${type}`);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    entreprise: '',
    adresse: '',
    type: 'PARTICULIER' as ClientType,
  });

  const filteredClients = clients.filter(
    (client) =>
      client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.entreprise.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async () => {
    try {
      await addClient(formData);
      setIsAddDialogOpen(false);
      resetForm();
      toast.success(t('pages.clients.createSuccess'));
    } catch {
      toast.error(t('pages.clients.createError'));
    }
  };

  const handleEdit = async () => {
    if (selectedClient) {
      try {
        await updateClient(selectedClient.id, formData);
        setIsEditDialogOpen(false);
        setSelectedClient(null);
        toast.success(t('pages.clients.updateSuccess'));
      } catch {
        toast.error(t('pages.clients.updateError'));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('pages.clients.deleteConfirm'))) {
      try {
        await deleteClient(id);
        toast.success(t('pages.clients.deleteSuccess'));
      } catch {
        toast.error(t('pages.clients.deleteError'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      entreprise: '',
      adresse: '',
      type: ClientType.PARTICULIER,
    });
  };

  const openEditDialog = (client: typeof clients[0]) => {
    setSelectedClient(client);
    setFormData({
      nom: client.nom,
      prenom: client.prenom,
      email: client.email,
      telephone: client.telephone,
      entreprise: client.entreprise,
      adresse: client.adresse,
      type: client.type,
    });
    setIsEditDialogOpen(true);
  };

  const openDetailDialog = (client: typeof clients[0]) => {
    setSelectedClient(client);
    setIsDetailDialogOpen(true);
  };

  const getClientCommandes = (clientId: string) => {
    return commandes.filter((c) => c.clientId === clientId);
  };

  const getClientInteractions = (clientId: string) => {
    return interactions.filter((i) => i.clientId === clientId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('pages.clients.title')}</h1>
          <p className="text-slate-500">{t('pages.clients.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('pages.clients.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pages.clients.createTitle')}</DialogTitle>
              <DialogDescription>{t('pages.clients.createDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">{t('common.firstName')}</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">{t('common.name')}</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">{t('common.phone')}</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t('common.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as ClientType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARTICULIER">{t('statusLabels.clientType.PARTICULIER')}</SelectItem>
                    <SelectItem value="ENTREPRISE">{t('statusLabels.clientType.ENTREPRISE')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type === 'ENTREPRISE' && (
                <div className="space-y-2">
                  <Label htmlFor="entreprise">{t('common.company')}</Label>
                  <Input
                    id="entreprise"
                    value={formData.entreprise}
                    onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="adresse">{t('common.address')}</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                {t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('pages.clients.search')}
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
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('common.phone')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('common.company')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.prenom} {client.nom}
                  </TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.telephone}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        client.type === ClientType.ENTREPRISE
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }
                    >
                      {client.type === ClientType.ENTREPRISE ? (
                        <Building2 className="w-3 h-3 mr-1" />
                      ) : (
                        <User className="w-3 h-3 mr-1" />
                      )}
                      {getClientTypeLabel(client.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.entreprise || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailDialog(client)}
                      >
                        {t('common.details')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(client)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pages.clients.editTitle')}</DialogTitle>
            <DialogDescription>{t('pages.clients.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prenom">{t('common.firstName')}</Label>
                <Input
                  id="edit-prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nom">{t('common.name')}</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('common.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telephone">{t('common.phone')}</Label>
              <Input
                id="edit-telephone"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-adresse">{t('common.address')}</Label>
              <Input
                id="edit-adresse"
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedClient?.prenom} {selectedClient?.nom}
            </DialogTitle>
            <DialogDescription>
              {t('pages.clients.detailDescription')}
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">{t('common.information')}</TabsTrigger>
                <TabsTrigger value="commandes">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {t('common.orders')}
                </TabsTrigger>
                <TabsTrigger value="interactions">
                  <History className="w-4 h-4 mr-2" />
                  {t('common.interactions')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500">{t('common.email')}</Label>
                    <p className="font-medium">{selectedClient.email}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{t('common.phone')}</Label>
                    <p className="font-medium">{selectedClient.telephone}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{t('common.type')}</Label>
                    <p className="font-medium">{getClientTypeLabel(selectedClient.type)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{t('common.company')}</Label>
                    <p className="font-medium">{selectedClient.entreprise || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-slate-500">{t('common.address')}</Label>
                    <p className="font-medium">{selectedClient.adresse}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">{t('pages.clients.createdAt')}</Label>
                    <p className="font-medium">
                      {new Date(selectedClient.dateCreation).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="commandes">
                {getClientCommandes(selectedClient.id).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('common.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getClientCommandes(selectedClient.id).map((cmd) => (
                        <TableRow key={cmd.id}>
                          <TableCell>CMD-{cmd.id}</TableCell>
                          <TableCell>
                            {new Date(cmd.dateCommande).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`statusLabels.order.${cmd.statut}`)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {cmd.montantTotal.toLocaleString('fr-FR')} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-slate-500 py-8">{t('pages.clients.noOrders')}</p>
                )}
              </TabsContent>

              <TabsContent value="interactions">
                {getClientInteractions(selectedClient.id).length > 0 ? (
                  <div className="space-y-3">
                    {getClientInteractions(selectedClient.id).map((interaction) => (
                      <div key={interaction.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Badge>{interaction.type}</Badge>
                          <span className="text-sm text-slate-500">
                            {new Date(interaction.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{interaction.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">{t('pages.clients.noInteractions')}</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
