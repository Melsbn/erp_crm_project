import { useState } from 'react';
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
  const { commandes, clients, produits, lignesCommande, addCommande, updateCommande, deleteCommande, addFacture } = useStore();
  const { user } = useAuth();
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

  const getClientName = (id: string) => {
    const client = clients.find((c) => c.id === id);
    return client ? `${client.prenom} ${client.nom}` : 'Client inconnu';
  };

  const getProduitName = (id: string) => {
    const produit = produits.find((p) => p.id === id);
    return produit?.nom || 'Produit inconnu';
  };

  const getCommandeLignes = (commandeId: string) => {
    return lignesCommande.filter((l) => l.commandeId === commandeId);
  };

  const calculateTotal = () => {
    return formData.lignes.reduce((total, ligne) => {
      const produit = produits.find((p) => p.id === ligne.produitId);
      return total + (produit?.prix || 0) * ligne.quantite;
    }, 0);
  };

  const handleAdd = async () => {
    if (!formData.clientId || formData.lignes.length === 0) {
      toast.error('Veuillez sélectionner un client et ajouter au moins un produit');
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
      toast.success('Commande créée avec succès');
    } catch {
      toast.error('Échec de création de la commande');
    }
  };

  const handleUpdateStatut = async (id: string, statut: StatutCommande) => {
    try {
      await updateCommande(id, { statut });

      if (statut === StatutCommande.CONFIRMEE) {
        const commande = commandes.find((c) => c.id === id);
        if (commande) {
          const factureNumber = `FAC-2024-${String(getNextFactureNumber()).padStart(3, '0')}`;
          await addFacture({
            numeroFacture: factureNumber,
            dateEmission: new Date().toISOString(),
            montantTotal: commande.montantTotal,
            statutPaiement: StatutPaiement.EN_ATTENTE,
            commandeId: id,
            clientId: commande.clientId,
          });
          toast.success('Commande confirmée et facture générée');
          return;
        }
      }

      toast.success('Statut mis à jour');
    } catch {
      toast.error('Échec de mise à jour du statut');
    }
  };

  const getNextFactureNumber = () => {
    return useStore.getState().factures.length + 1;
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      try {
        await deleteCommande(id);
        toast.success('Commande supprimée avec succès');
      } catch {
        toast.error('Échec de suppression de la commande');
      }
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

  const openDetailDialog = (commande: typeof commandes[0]) => {
    setSelectedCommande(commande);
    setIsDetailDialogOpen(true);
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
          <h1 className="text-2xl font-bold text-slate-800">Gestion des commandes</h1>
          <p className="text-slate-500">Créez et suivez les commandes clients</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle commande
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une commande</DialogTitle>
              <DialogDescription>
                Sélectionnez un client et ajoutez des produits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={String(formData.clientId)}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
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
                  <Label>Produits</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {formData.lignes.map((ligne, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={String(ligne.produitId)}
                        onValueChange={(value) => updateLigne(index, 'produitId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Produit" />
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
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes éventuelles..."
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-xl font-bold">{calculateTotal().toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
                Créer la commande
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
                <ShoppingCart className="w-5 h-5 text-slate-600" />
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
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Brouillons</p>
                <p className="text-xl font-bold">{stats.brouillon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Confirmées</p>
                <p className="text-xl font-bold">{stats.confirme}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Livrées</p>
                <p className="text-xl font-bold">{stats.livre}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Annulées</p>
                <p className="text-xl font-bold">{stats.annule}</p>
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
                placeholder="Rechercher une commande..."
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
                <TableHead>N° Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommandes.map((commande) => {
                const Icon = statutIcons[commande.statut];
                return (
                  <TableRow key={commande.id}>
                    <TableCell className="font-medium">CMD-{commande.id}</TableCell>
                    <TableCell>{getClientName(commande.clientId)}</TableCell>
                    <TableCell>
                      {new Date(commande.dateCommande).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={statutColors[commande.statut]}>
                        <Icon className="w-3 h-3 mr-1" />
                        {commande.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {commande.montantTotal.toLocaleString('fr-FR')} €
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailDialog(commande)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {commande.statut === StatutCommande.BROUILLON && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleUpdateStatut(commande.id, StatutCommande.CONFIRMEE)}
                          >
                            Confirmer
                          </Button>
                        )}
                        {commande.statut === StatutCommande.CONFIRMEE && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => handleUpdateStatut(commande.id, StatutCommande.LIVREE)}
                          >
                            Livrer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(commande.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commande CMD-{selectedCommande?.id}</DialogTitle>
            <DialogDescription>
              Détails de la commande
            </DialogDescription>
          </DialogHeader>
          {selectedCommande && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Client</Label>
                  <p className="font-medium">{getClientName(selectedCommande.clientId)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Date</Label>
                  <p className="font-medium">
                    {new Date(selectedCommande.dateCommande).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Statut</Label>
                  <p>
                    <Badge className={statutColors[selectedCommande.statut]}>
                      {selectedCommande.statut}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Total</Label>
                  <p className="font-medium text-lg">
                    {selectedCommande.montantTotal.toLocaleString('fr-FR')} €
                  </p>
                </div>
              </div>

              {selectedCommande.notes && (
                <div>
                  <Label className="text-slate-500">Notes</Label>
                  <p className="text-sm">{selectedCommande.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-slate-500">Produits</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Prix unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCommandeLignes(selectedCommande.id).map((ligne) => (
                      <TableRow key={ligne.id}>
                        <TableCell>{getProduitName(ligne.produitId)}</TableCell>
                        <TableCell className="text-right">{ligne.quantite}</TableCell>
                        <TableCell className="text-right">
                          {ligne.prixUnitaire.toLocaleString('fr-FR')} €
                        </TableCell>
                        <TableCell className="text-right">
                          {ligne.sousTotal.toLocaleString('fr-FR')} €
                        </TableCell>
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

