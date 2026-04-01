import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { StatutCommande, StatutPaiement } from '@/types';
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
import { Plus, Search, Eye, Trash2, ShoppingCart, Package, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const statutColors: Record<StatutCommande, string> = {
  [StatutCommande.BROUILLON]: 'bg-slate-100 text-slate-700',
  [StatutCommande.CONFIRMEE]: 'bg-blue-100 text-blue-700',
  [StatutCommande.LIVREE]: 'bg-green-100 text-green-700',
  [StatutCommande.ANNULEE]: 'bg-red-100 text-red-700',
};

const statutIcons = {
  [StatutCommande.BROUILLON]: ShoppingCart,
  [StatutCommande.CONFIRMEE]: CheckCircle2,
  [StatutCommande.LIVREE]: Truck,
  [StatutCommande.ANNULEE]: XCircle,
};

export function CommandesPage() {
  const { t, i18n } = useTranslation();
  const { commandes, clients, produits, lignesCommande, addCommande, updateCommande, deleteCommande, addFacture } = useStore();
  const { user } = useAuth();
  const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : 'fr-FR';
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<typeof commandes[0] | null>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    notes: '',
    lignes: [] as { produitId: string; quantite: number }[],
  });

  const filteredCommandes = commandes.filter(
    (cmd) =>
      cmd.id.toString().includes(searchTerm) ||
      getClientName(cmd.clientId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getClientName(id: string) {
    const client = clients.find((c) => c.id === id);
    return client ? `${client.prenom} ${client.nom}` : t('common.unknownClient');
  }

  function getProduitName(id: string) {
    const produit = produits.find((p) => p.id === id);
    return produit?.nom || t('common.unknownProduct');
  }

  const getCommandeLignes = (commandeId: string) => lignesCommande.filter((l) => l.commandeId === commandeId);

  const calculateTotal = () =>
    formData.lignes.reduce((total, ligne) => {
      const produit = produits.find((p) => p.id === ligne.produitId);
      return total + (produit?.prix || 0) * ligne.quantite;
    }, 0);

  const handleAdd = async () => {
    if (!formData.clientId || formData.lignes.length === 0) {
      toast.error(t('pages.orders.selectClientAndProduct'));
      return;
    }

    const lignesWithPrices = formData.lignes.map((l) => {
      const produit = produits.find((p) => p.id === l.produitId);
      return {
        produitId: l.produitId,
        quantite: l.quantite,
        prixUnitaire: produit?.prix || 0,
        sousTotal: (produit?.prix || 0) * l.quantite,
      };
    });

    try {
      await addCommande({
        dateCommande: new Date().toISOString(),
        statut: StatutCommande.BROUILLON,
        montantTotal: calculateTotal(),
        notes: formData.notes,
        clientId: formData.clientId,
        userId: user?.id ?? '',
        lignes: lignesWithPrices,
      });

      setIsAddDialogOpen(false);
      setFormData({ clientId: '', notes: '', lignes: [] });
      toast.success(t('pages.orders.createSuccess'));
    } catch {
      toast.error(t('pages.orders.createError'));
    }
  };

  const handleUpdateStatut = async (id: string, statut: StatutCommande) => {
    try {
      await updateCommande(id, { statut });

      if (statut === StatutCommande.CONFIRMEE) {
        const commande = commandes.find((c) => c.id === id);
        if (commande) {
          const factureNumber = `FAC-2024-${String(useStore.getState().factures.length + 1).padStart(3, '0')}`;
          await addFacture({
            numeroFacture: factureNumber,
            dateEmission: new Date().toISOString(),
            montantTotal: commande.montantTotal,
            statutPaiement: StatutPaiement.EN_ATTENTE,
            commandeId: id,
            clientId: commande.clientId,
          });
          toast.success(t('pages.orders.generatedInvoiceSuccess'));
          return;
        }
      }

      toast.success(t('pages.orders.updateStatusSuccess'));
    } catch {
      toast.error(t('pages.orders.updateStatusError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('pages.orders.deleteConfirm'))) {
      return;
    }

    try {
      await deleteCommande(id);
      toast.success(t('pages.orders.deleteSuccess'));
    } catch {
      toast.error(t('pages.orders.deleteError'));
    }
  };

  const addLigne = () => {
    setFormData({
      ...formData,
      lignes: [...formData.lignes, { produitId: '', quantite: 1 }],
    });
  };

  const updateLigne = (index: number, field: string, value: string | number) => {
    const newLignes = [...formData.lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setFormData({ ...formData, lignes: newLignes });
  };

  const removeLigne = (index: number) => {
    setFormData({
      ...formData,
      lignes: formData.lignes.filter((_, i) => i !== index),
    });
  };

  const stats = {
    total: commandes.length,
    brouillon: commandes.filter((c) => c.statut === StatutCommande.BROUILLON).length,
    confirme: commandes.filter((c) => c.statut === StatutCommande.CONFIRMEE).length,
    livre: commandes.filter((c) => c.statut === StatutCommande.LIVREE).length,
    annule: commandes.filter((c) => c.statut === StatutCommande.ANNULEE).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('pages.orders.title')}</h1>
          <p className="text-slate-500">{t('pages.orders.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              {t('pages.orders.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('pages.orders.createTitle')}</DialogTitle>
              <DialogDescription>{t('pages.orders.createDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">{t('common.client')}</Label>
                <Select
                  value={String(formData.clientId)}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('pages.orders.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('common.products')}</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                    <Plus className="mr-1 h-4 w-4" />
                    {t('pages.orders.addProduct')}
                  </Button>
                </div>
                {formData.lignes.map((ligne, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Select
                        value={String(ligne.produitId)}
                        onValueChange={(value) => updateLigne(index, 'produitId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('pages.orders.productPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {produits.filter((p) => p.disponible).map((produit) => (
                            <SelectItem key={produit.id} value={String(produit.id)}>
                              {produit.nom} - {produit.prix} €
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min={1}
                        value={ligne.quantite}
                        onChange={(e) => updateLigne(index, 'quantite', Number(e.target.value))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLigne(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t('common.notes')}</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('pages.orders.optionalNotes')}
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t('pages.orders.totalLabel')}</span>
                  <span className="text-xl font-bold">{calculateTotal().toLocaleString(locale)} €</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                {t('pages.orders.createTitle')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><ShoppingCart className="h-5 w-5 text-slate-600" /></div><div><p className="text-sm text-slate-500">{t('common.total')}</p><p className="text-xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><Package className="h-5 w-5 text-slate-600" /></div><div><p className="text-sm text-slate-500">{t('pages.orders.drafts')}</p><p className="text-xl font-bold">{stats.brouillon}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"><CheckCircle2 className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-slate-500">{t('pages.orders.confirmed')}</p><p className="text-xl font-bold">{stats.confirme}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100"><Truck className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-slate-500">{t('pages.orders.delivered')}</p><p className="text-xl font-bold">{stats.livre}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100"><XCircle className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-slate-500">{t('pages.orders.cancelled')}</p><p className="text-xl font-bold">{stats.annule}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('pages.orders.search')}
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
                <TableHead>{t('pages.orders.orderNumber')}</TableHead>
                <TableHead>{t('common.client')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommandes.map((commande) => {
                const Icon = statutIcons[commande.statut];
                return (
                  <TableRow key={commande.id}>
                    <TableCell className="font-medium">CMD-{commande.id}</TableCell>
                    <TableCell>{getClientName(commande.clientId)}</TableCell>
                    <TableCell>{new Date(commande.dateCommande).toLocaleDateString(locale)}</TableCell>
                    <TableCell>
                      <Badge className={statutColors[commande.statut]}>
                        <Icon className="mr-1 h-3 w-3" />
                        {t(`statusLabels.order.${commande.statut}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{commande.montantTotal.toLocaleString(locale)} €</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedCommande(commande); setIsDetailDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {commande.statut === StatutCommande.BROUILLON && (
                          <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleUpdateStatut(commande.id, StatutCommande.CONFIRMEE)}>
                            {t('pages.orders.confirmAction')}
                          </Button>
                        )}
                        {commande.statut === StatutCommande.CONFIRMEE && (
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => handleUpdateStatut(commande.id, StatutCommande.LIVREE)}>
                            {t('pages.orders.deliverAction')}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(commande.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('pages.orders.orderNumber')} CMD-{selectedCommande?.id}</DialogTitle>
            <DialogDescription>{t('pages.orders.detailsDescription')}</DialogDescription>
          </DialogHeader>
          {selectedCommande && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">{t('common.client')}</Label>
                  <p className="font-medium">{getClientName(selectedCommande.clientId)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('common.date')}</Label>
                  <p className="font-medium">{new Date(selectedCommande.dateCommande).toLocaleDateString(locale)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('common.status')}</Label>
                  <p><Badge className={statutColors[selectedCommande.statut]}>{t(`statusLabels.order.${selectedCommande.statut}`)}</Badge></p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('common.total')}</Label>
                  <p className="text-lg font-medium">{selectedCommande.montantTotal.toLocaleString(locale)} €</p>
                </div>
              </div>

              {selectedCommande.notes && (
                <div>
                  <Label className="text-slate-500">{t('common.notes')}</Label>
                  <p className="text-sm">{selectedCommande.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-slate-500">{t('common.products')}</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.products').slice(0, -1) || t('pages.orders.productPlaceholder')}</TableHead>
                      <TableHead className="text-right">{t('common.quantityShort')}</TableHead>
                      <TableHead className="text-right">{t('common.unitPrice')}</TableHead>
                      <TableHead className="text-right">{t('common.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCommandeLignes(selectedCommande.id).map((ligne) => (
                      <TableRow key={ligne.id}>
                        <TableCell>{getProduitName(ligne.produitId)}</TableCell>
                        <TableCell className="text-right">{ligne.quantite}</TableCell>
                        <TableCell className="text-right">{ligne.prixUnitaire.toLocaleString(locale)} €</TableCell>
                        <TableCell className="text-right">{ligne.sousTotal.toLocaleString(locale)} €</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
