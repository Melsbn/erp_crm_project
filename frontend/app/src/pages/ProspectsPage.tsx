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
import { Plus, Search, Edit2, Trash2, UserPlus, ArrowRight, Star, Phone, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const statutColors: Record<ProspectStatut, string> = {
  [ProspectStatut.NOUVEAU]: 'bg-blue-100 text-blue-700',
  [ProspectStatut.CONTACTE]: 'bg-yellow-100 text-yellow-700',
  [ProspectStatut.QUALIFIE]: 'bg-green-100 text-green-700',
  [ProspectStatut.PERDU]: 'bg-red-100 text-red-700',
};

export function ProspectsPage() {
  const { t } = useTranslation();
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
      toast.success(t('pages.prospects.createSuccess'));
    } catch {
      toast.error(t('pages.prospects.createError'));
    }
  };

  const handleEdit = async () => {
    if (selectedProspect) {
      try {
        await updateProspect(selectedProspect.id, formData);
        setIsEditDialogOpen(false);
        setSelectedProspect(null);
        toast.success(t('pages.prospects.updateSuccess'));
      } catch {
        toast.error(t('pages.prospects.updateError'));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('pages.prospects.deleteConfirm'))) {
      try {
        await deleteProspect(id);
        toast.success(t('pages.prospects.deleteSuccess'));
      } catch {
        toast.error(t('pages.prospects.deleteError'));
      }
    }
  };

  const handleConvert = async () => {
    if (selectedProspect) {
      try {
        await convertProspectToClient(selectedProspect.id, convertData);
        setIsConvertDialogOpen(false);
        setSelectedProspect(null);
        toast.success(t('pages.prospects.convertSuccess'));
      } catch {
        toast.error(t('pages.prospects.convertError'));
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
          <h1 className="text-2xl font-bold text-slate-800">{t('pages.prospects.title')}</h1>
          <p className="text-slate-500">{t('pages.prospects.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('pages.prospects.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pages.prospects.createTitle')}</DialogTitle>
              <DialogDescription>{t('pages.prospects.createDescription')}</DialogDescription>
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
                <Label htmlFor="entreprise">{t('common.company')}</Label>
                <Input
                  id="entreprise"
                  value={formData.entreprise}
                  onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statut">{t('common.status')}</Label>
                <Select
                  value={formData.statut}
                  onValueChange={(value) => setFormData({ ...formData, statut: value as ProspectStatut })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOUVEAU">{t('statusLabels.prospect.NOUVEAU')}</SelectItem>
                    <SelectItem value="CONTACTE">{t('statusLabels.prospect.CONTACTE')}</SelectItem>
                    <SelectItem value="QUALIFIE">{t('statusLabels.prospect.QUALIFIE')}</SelectItem>
                    <SelectItem value="PERDU">{t('statusLabels.prospect.PERDU')}</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('common.total')}</p>
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
                <p className="text-sm text-slate-500">{t('pages.prospects.statsNew')}</p>
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
                <p className="text-sm text-slate-500">{t('pages.prospects.statsContacted')}</p>
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
                <p className="text-sm text-slate-500">{t('pages.prospects.statsQualified')}</p>
                <p className="text-xl font-bold">{stats.qualifie}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('pages.prospects.statsLost')}</p>
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
                placeholder={t('pages.prospects.search')}
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
                <TableHead>{t('common.company')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                      {t(`statusLabels.prospect.${prospect.statut}`)}
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
                          {t('common.convert')}
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
            <DialogTitle>{t('pages.prospects.editTitle')}</DialogTitle>
            <DialogDescription>{t('pages.prospects.editDescription')}</DialogDescription>
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
              <Label htmlFor="edit-statut">{t('common.status')}</Label>
              <Select
                value={formData.statut}
                onValueChange={(value) => setFormData({ ...formData, statut: value as ProspectStatut })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProspectStatut.NOUVEAU}>{t('statusLabels.prospect.NOUVEAU')}</SelectItem>
                  <SelectItem value={ProspectStatut.CONTACTE}>{t('statusLabels.prospect.CONTACTE')}</SelectItem>
                  <SelectItem value={ProspectStatut.QUALIFIE}>{t('statusLabels.prospect.QUALIFIE')}</SelectItem>
                  <SelectItem value={ProspectStatut.PERDU}>{t('statusLabels.prospect.PERDU')}</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Convert Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pages.prospects.convertTitle')}</DialogTitle>
            <DialogDescription>
              {selectedProspect && (
                <>
                  {t('pages.prospects.convertDescription', { name: `${selectedProspect.prenom} ${selectedProspect.nom}` })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="convert-type">{t('pages.prospects.clientType')}</Label>
              <Select
                value={convertData.type}
                onValueChange={(value) => setConvertData({ ...convertData, type: value as ClientType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ClientType.PARTICULIER}>{t('statusLabels.clientType.PARTICULIER')}</SelectItem>
                  <SelectItem value={ClientType.ENTREPRISE}>{t('statusLabels.clientType.ENTREPRISE')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="convert-adresse">{t('common.address')}</Label>
              <Input
                id="convert-adresse"
                value={convertData.adresse}
                onChange={(e) => setConvertData({ ...convertData, adresse: e.target.value })}
                placeholder={t('pages.prospects.fullAddress')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConvert} className="bg-green-600 hover:bg-green-700">
              <ArrowRight className="w-4 h-4 mr-2" />
              {t('common.convert')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
