import { useState } from 'react';
import { useStore } from '@/store';
import { ProspectStatut, ClientType } from '@/types';
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
import { Plus, Search, Edit2, Trash2, UserPlus, ArrowRight, Star, Phone, Mail, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const statutColors: Record<ProspectStatut, string> = {
  [ProspectStatut.NOUVEAU]: 'bg-blue-100 text-blue-700',
  [ProspectStatut.CONTACTE]: 'bg-yellow-100 text-yellow-700',
  [ProspectStatut.QUALIFIE]: 'bg-green-100 text-green-700',
  [ProspectStatut.PERDU]: 'bg-red-100 text-red-700',
};

export function ProspectsPage() {
  const { prospects, addProspect, updateProspect, deleteProspect, convertProspectToClient } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<typeof prospects[0] | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    entreprise: '',
    statut: 'NOUVEAU' as ProspectStatut,
  });

  const [convertData, setConvertData] = useState({
    adresse: '',
    type: 'PARTICULIER' as ClientType,
  });

  const filteredProspects = prospects.filter(
    (prospect) =>
      prospect.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.entreprise.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async () => {
    try {
      await addProspect(formData);
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Prospect créé avec succès');
    } catch {
      toast.error('Échec de création du prospect');
    }
  };

  const handleEdit = async () => {
    if (selectedProspect) {
      try {
        await updateProspect(selectedProspect.id, formData);
        setIsEditDialogOpen(false);
        setSelectedProspect(null);
        toast.success('Prospect mis à jour avec succès');
      } catch {
        toast.error('Échec de mise à jour du prospect');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce prospect ?')) {
      try {
        await deleteProspect(id);
        toast.success('Prospect supprimé avec succès');
      } catch {
        toast.error('Échec de suppression du prospect');
      }
    }
  };

  const handleConvert = async () => {
    if (selectedProspect) {
      try {
        await convertProspectToClient(selectedProspect.id, convertData);
        setIsConvertDialogOpen(false);
        setSelectedProspect(null);
        toast.success('Prospect converti en client avec succès');
      } catch {
        toast.error('Échec de conversion du prospect');
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
      statut: ProspectStatut.NOUVEAU,
    });
  };

  const openEditDialog = (prospect: typeof prospects[0]) => {
    setSelectedProspect(prospect);
    setFormData({
      nom: prospect.nom,
      prenom: prospect.prenom,
      email: prospect.email,
      telephone: prospect.telephone,
      entreprise: prospect.entreprise,
      statut: prospect.statut,
    });
    setIsEditDialogOpen(true);
  };

  const openConvertDialog = (prospect: typeof prospects[0]) => {
    setSelectedProspect(prospect);
    setConvertData({
      adresse: '',
      type: ClientType.PARTICULIER,
    });
    setIsConvertDialogOpen(true);
  };

  const stats = {
    total: prospects.length,
    nouveau: prospects.filter((p) => p.statut === ProspectStatut.NOUVEAU).length,
    contacte: prospects.filter((p) => p.statut === ProspectStatut.CONTACTE).length,
    qualifie: prospects.filter((p) => p.statut === ProspectStatut.QUALIFIE).length,
    perdu: prospects.filter((p) => p.statut === ProspectStatut.PERDU).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des prospects</h1>
          <p className="text-slate-500">Suivez et convertissez vos prospects</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau prospect
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un prospect</DialogTitle>
              <DialogDescription>
                Remplissez les informations pour créer un nouveau prospect
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entreprise">Entreprise</Label>
                <Input
                  id="entreprise"
                  value={formData.entreprise}
                  onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => setFormData({ ...formData, statut: value as ProspectStatut })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOUVEAU">Nouveau</SelectItem>
                    <SelectItem value="CONTACTE">Contacté</SelectItem>
                    <SelectItem value="QUALIFIE">Qualifié</SelectItem>
                    <SelectItem value="PERDU">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Nouveaux</p>
                <p className="text-xl font-bold">{stats.nouveau}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Contactés</p>
                <p className="text-xl font-bold">{stats.contacte}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Qualifiés</p>
                <p className="text-xl font-bold">{stats.qualifie}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Perdus</p>
                <p className="text-xl font-bold">{stats.perdu}</p>
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
                placeholder="Rechercher un prospect..."
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
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-medium">
                    {prospect.prenom} {prospect.nom}
                  </TableCell>
                  <TableCell>{prospect.email}</TableCell>
                  <TableCell>{prospect.telephone}</TableCell>
                  <TableCell>{prospect.entreprise || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statutColors[prospect.statut]}>
                      {prospect.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {prospect.statut === ProspectStatut.QUALIFIE && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => openConvertDialog(prospect)}
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Convertir
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(prospect)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(prospect.id)}
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
            <DialogTitle>Modifier le prospect</DialogTitle>
            <DialogDescription>
              Modifiez les informations du prospect
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-prenom">Prénom</Label>
                <Input
                  id="edit-prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telephone">Téléphone</Label>
              <Input
                id="edit-telephone"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-statut">Statut</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => setFormData({ ...formData, statut: value as ProspectStatut })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProspectStatut.NOUVEAU}>Nouveau</SelectItem>
                  <SelectItem value={ProspectStatut.CONTACTE}>Contacté</SelectItem>
                  <SelectItem value={ProspectStatut.QUALIFIE}>Qualifié</SelectItem>
                  <SelectItem value={ProspectStatut.PERDU}>Perdu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convertir en client</DialogTitle>
            <DialogDescription>
              {selectedProspect && (
                <>
                  Convertir <strong>{selectedProspect.prenom} {selectedProspect.nom}</strong> en client
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="convert-type">Type de client</Label>
              <Select
                value={convertData.type}
                onValueChange={(value) => setConvertData({ ...convertData, type: value as ClientType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ClientType.PARTICULIER}>Particulier</SelectItem>
                  <SelectItem value={ClientType.ENTREPRISE}>Entreprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="convert-adresse">Adresse</Label>
              <Input
                id="convert-adresse"
                value={convertData.adresse}
                onChange={(e) => setConvertData({ ...convertData, adresse: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConvert} className="bg-green-600 hover:bg-green-700">
              <ArrowRight className="w-4 h-4 mr-2" />
              Convertir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


