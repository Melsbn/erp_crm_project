import { useState } from 'react';
import { useStore } from '@/store';
import { StatutPaiement, MethodePaiement } from '@/types';
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
import { Search, Eye, Download, CreditCard, CheckCircle2, Clock, AlertCircle, FileText, Mail } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const statutColors: Record<StatutPaiement, string> = {
  [StatutPaiement.EN_ATTENTE]: 'bg-yellow-100 text-yellow-700',
  [StatutPaiement.PAYEE]: 'bg-green-100 text-green-700',
  [StatutPaiement.PARTIELLE]: 'bg-orange-100 text-orange-700',
};

const statutIcons = {
  [StatutPaiement.EN_ATTENTE]: Clock,
  [StatutPaiement.PAYEE]: CheckCircle2,
  [StatutPaiement.PARTIELLE]: AlertCircle,
};

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  blue:   [37,  99,  235] as [number,number,number],
  dark:   [15,  23,  42 ] as [number,number,number],
  gray:   [100, 116, 139] as [number,number,number],
  light:  [248, 250, 252] as [number,number,number],
  white:  [255, 255, 255] as [number,number,number],
  green:  [22,  163, 74 ] as [number,number,number],
  amber:  [217, 119, 6  ] as [number,number,number],
  red:    [220, 38,  38 ] as [number,number,number],
  border: [226, 232, 240] as [number,number,number],
};

function statutColor(s: StatutPaiement): [number,number,number] {
  if (s === StatutPaiement.PAYEE)      return C.green;
  if (s === StatutPaiement.PARTIELLE)  return C.amber;
  return C.amber;
}

function statutLabel(s: StatutPaiement): string {
  if (s === StatutPaiement.PAYEE)      return 'PAYÉE';
  if (s === StatutPaiement.PARTIELLE)  return 'PARTIELLE';
  return 'EN ATTENTE';
}

// ─── PDF builder ──────────────────────────────────────────────────────────────
function generateInvoicePdf(
  facture: { id: string; numeroFacture: string; dateEmission: string; statutPaiement: StatutPaiement; montantTotal: number; clientId: string; lignes?: any[] },
  clientName: string,
  paiements: Array<{ id: string; datePaiement: string; methode: string; reference: string; montant: number }>,
  montantPaye: number
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = pdf.internal.pageSize.getWidth();   // 210
  const PH = pdf.internal.pageSize.getHeight();  // 297
  const M  = 16;
  const CW = PW - M * 2; // content width = 178

  const montantRestant = Math.max(0, facture.montantTotal - montantPaye);
  const isPaid = facture.statutPaiement === StatutPaiement.PAYEE;

  // ── Header band ─────────────────────────────────────────────────────────────
  pdf.setFillColor(...C.blue);
  pdf.rect(0, 0, PW, 48, 'F');

  // Company placeholder (left)
  pdf.setTextColor(...C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('VOTRE ENTREPRISE', M, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(186, 212, 255);
  pdf.text('123 Rue de la Paix, 75001 Paris', M, 28);
  pdf.text('contact@entreprise.fr  •  +33 1 00 00 00 00', M, 34);

  // "FACTURE" badge (right)
  pdf.setFillColor(255, 255, 255, 0.12 as any);
  pdf.roundedRect(PW - M - 42, 10, 42, 28, 4, 4, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('FACTURE', PW - M - 21, 22, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(196, 215, 255);
  pdf.text(facture.numeroFacture, PW - M - 21, 32, { align: 'center' });

  // ── Info row (client + dates) ────────────────────────────────────────────────
  const infoY = 58;
  // Client card
  pdf.setFillColor(...C.light);
  pdf.roundedRect(M, infoY, CW * 0.55, 36, 4, 4, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.gray);
  pdf.text('FACTURÉ À', M + 5, infoY + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...C.dark);
  pdf.text(clientName, M + 5, infoY + 17);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C.gray);
  pdf.text(`ID client : ${facture.clientId.slice(0, 12)}`, M + 5, infoY + 25);

  // Dates card
  const dateX = M + CW * 0.55 + 6;
  const dateW = CW - CW * 0.55 - 6;
  pdf.setFillColor(...C.light);
  pdf.roundedRect(dateX, infoY, dateW, 36, 4, 4, 'F');

  const dateRows = [
    ['Date d\'émission',  new Date(facture.dateEmission).toLocaleDateString('fr-FR')],
    ['Statut',            statutLabel(facture.statutPaiement)],
  ];
  dateRows.forEach(([k, v], i) => {
    const dy = infoY + 10 + i * 12;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.gray);
    pdf.text(k, dateX + 5, dy);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    // colour-code the status
    if (k === 'Statut') {
      pdf.setTextColor(...statutColor(facture.statutPaiement));
    } else {
      pdf.setTextColor(...C.dark);
    }
    pdf.text(v, dateX + dateW - 5, dy, { align: 'right' });
  });

  // ── Amount summary band ──────────────────────────────────────────────────────
  const sumY = infoY + 44;
  const cardW = (CW - 6) / 3;

  const summaryCards = [
    { label: 'Montant total',  value: `${facture.montantTotal.toLocaleString('fr-FR')} €`, color: C.blue  },
    { label: 'Montant payé',   value: `${montantPaye.toLocaleString('fr-FR')} €`,          color: C.green },
    { label: 'Reste à payer',  value: `${montantRestant.toLocaleString('fr-FR')} €`,       color: isPaid ? C.green : C.red },
  ];

  summaryCards.forEach((card, i) => {
    const cx = M + i * (cardW + 3);
    pdf.setFillColor(...C.white);
    pdf.roundedRect(cx, sumY, cardW, 22, 3, 3, 'F');
    pdf.setDrawColor(...C.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(cx, sumY, cardW, 22, 3, 3, 'S');
    // accent
    pdf.setFillColor(...card.color);
    pdf.rect(cx, sumY, 3, 22, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...C.gray);
    pdf.text(card.label, cx + 7, sumY + 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...card.color);
    pdf.text(card.value, cx + 7, sumY + 17);
  });

  // ── Payment history table ────────────────────────────────────────────────────
  const tableStartY = sumY + 32;

  // Section title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...C.dark);
  pdf.text('Historique des paiements', M, tableStartY);
  pdf.setDrawColor(...C.blue);
  pdf.setLineWidth(1.5);
  pdf.line(M, tableStartY + 2, M + 50, tableStartY + 2);
  pdf.setLineWidth(0.3);

  const tY = tableStartY + 8;
  const cols = [40, 40, 60, 38]; // widths: date, méthode, référence, montant
  const colX = [M, M + 40, M + 80, M + 140];
  const headers = ['Date', 'Méthode', 'Référence', 'Montant'];
  const rowH = 8;

  // Header row
  pdf.setFillColor(...C.blue);
  pdf.rect(M, tY, CW, rowH, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  headers.forEach((h, i) => {
    const align = i === 3 ? 'right' : 'left';
    const tx = i === 3 ? colX[i] + cols[i] - 2 : colX[i] + 2;
    pdf.text(h, tx, tY + 5.5, { align });
  });

  let curY = tY;

  if (paiements.length === 0) {
    curY += rowH;
    pdf.setFillColor(...C.light);
    pdf.rect(M, curY, CW, rowH, 'F');
    pdf.setTextColor(...C.gray);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Aucun paiement enregistré', M + CW / 2, curY + 5.5, { align: 'center' });
    curY += rowH;
  } else {
    paiements.forEach((p, ri) => {
      curY += rowH;
      if (ri % 2 === 0) pdf.setFillColor(...C.light);
      else              pdf.setFillColor(...C.white);
      pdf.rect(M, curY, CW, rowH, 'F');

      const cells = [
        new Date(p.datePaiement).toLocaleDateString('fr-FR'),
        p.methode,
        p.reference || '—',
        `${p.montant.toLocaleString('fr-FR')} €`,
      ];

      pdf.setTextColor(...C.dark);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      cells.forEach((cell, ci) => {
        const isRight = ci === 3;
        const tx = isRight ? colX[ci] + cols[ci] - 2 : colX[ci] + 2;
        const maxChars = Math.floor(cols[ci] / 2);
        const txt = cell.length > maxChars ? cell.slice(0, maxChars - 1) + '…' : cell;
        pdf.text(txt, tx, curY + 5.5, { align: isRight ? 'right' : 'left' });
      });
    });
    curY += rowH;
  }

  // Table border
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.2);
  pdf.rect(M, tY, CW, curY - tY, 'S');

  // ── Totals box ───────────────────────────────────────────────────────────────
  const totY = curY + 10;
  const totW = 80;
  const totX = PW - M - totW;

  pdf.setFillColor(...C.light);
  pdf.roundedRect(totX, totY, totW, 40, 4, 4, 'F');
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(totX, totY, totW, 40, 4, 4, 'S');

  const totRows = [
    { label: 'Total HT',      value: `${(facture.montantTotal * 0.8).toFixed(2)} €`,  bold: false },
    { label: 'TVA (20%)',     value: `${(facture.montantTotal * 0.2).toFixed(2)} €`,  bold: false },
    { label: 'Total TTC',     value: `${facture.montantTotal.toFixed(2)} €`,           bold: true  },
    { label: 'Déjà réglé',   value: `${montantPaye.toFixed(2)} €`,                    bold: false },
    { label: 'Solde restant', value: `${montantRestant.toFixed(2)} €`,                 bold: true  },
  ];

  totRows.forEach((row, i) => {
    const ry = totY + 7 + i * 7;
    const isLast = i === totRows.length - 1;
    if (isLast) {
      pdf.setDrawColor(...C.border);
      pdf.setLineWidth(0.3);
      pdf.line(totX + 3, ry - 2, totX + totW - 3, ry - 2);
    }
    pdf.setFont('helvetica', row.bold ? 'bold' : 'normal');
    pdf.setFontSize(row.bold ? 8.5 : 7.5);
    pdf.setTextColor(...(isLast && !isPaid ? C.red : C.dark));
    pdf.text(row.label, totX + 5, ry);
    pdf.text(row.value, totX + totW - 5, ry, { align: 'right' });
  });

  // ── Footer ───────────────────────────────────────────────────────────────────
  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.3);
  pdf.line(M, PH - 20, PW - M, PH - 20);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.gray);
  pdf.text('Merci pour votre confiance. Paiement à 30 jours par virement bancaire.', M, PH - 14);
  pdf.text(`IBAN : FR76 0000 0000 0000 0000 0000 000  •  BIC : XXXXXXXX`, M, PH - 9);
  pdf.text(facture.numeroFacture, PW - M, PH - 9, { align: 'right' });

  pdf.save(`${facture.numeroFacture}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FacturesPage() {
  const { factures, clients, paiements, addPaiement, updateFacture, sendInvoiceReminder } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPaiementDialogOpen, setIsPaiementDialogOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<typeof factures[0] | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const [paiementForm, setPaiementForm] = useState({
    montant: 0,
    methode: 'VIREMENT' as MethodePaiement,
    reference: '',
  });

  const filteredFactures = factures.filter(
    (facture) =>
      facture.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(facture.clientId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getClientName(id: string) {
    const client = clients.find((c) => c.id === id);
    return client ? `${client.prenom} ${client.nom}` : 'Client inconnu';
  }

  const getPaiementsForFacture = (factureId: string) =>
    paiements.filter((p) => p.factureId === factureId);

  const getMontantPaye = (factureId: string) =>
    getPaiementsForFacture(factureId).reduce((sum, p) => sum + p.montant, 0);

  const handleAddPaiement = async () => {
    if (!selectedFacture) return;
    const montantPaye = getMontantPaye(selectedFacture.id) + paiementForm.montant;
    const montantTotal = selectedFacture.montantTotal;
    let newStatut: StatutPaiement;
    if (montantPaye >= montantTotal)  newStatut = StatutPaiement.PAYEE;
    else if (montantPaye > 0)         newStatut = StatutPaiement.PARTIELLE;
    else                               newStatut = StatutPaiement.EN_ATTENTE;
    try {
      await addPaiement({
        ...paiementForm,
        datePaiement: new Date().toISOString(),
        factureId: selectedFacture.id,
      });
      await updateFacture(selectedFacture.id, {
        statutPaiement: newStatut,
        datePaiement: montantPaye >= montantTotal ? new Date().toISOString() : undefined,
      });
      setIsPaiementDialogOpen(false);
      setPaiementForm({ montant: 0, methode: MethodePaiement.VIREMENT, reference: '' });
      toast.success('Paiement enregistré avec succès');
    } catch {
      toast.error("Échec d'enregistrement du paiement");
    }
  };

  const openDetailDialog = (facture: typeof factures[0]) => {
    setSelectedFacture(facture);
    setIsDetailDialogOpen(true);
  };

  const openPaiementDialog = (facture: typeof factures[0]) => {
    setSelectedFacture(facture);
    const montantRestant = facture.montantTotal - getMontantPaye(facture.id);
    setPaiementForm({ montant: montantRestant, methode: MethodePaiement.VIREMENT, reference: '' });
    setIsPaiementDialogOpen(true);
  };

  const handleDownloadInvoice = (facture: typeof factures[0]) => {
    setDownloadingId(facture.id);
    try {
      generateInvoicePdf(
        facture,
        getClientName(facture.clientId),
        getPaiementsForFacture(facture.id),
        getMontantPaye(facture.id)
      );
      toast.success('Facture PDF téléchargée');
    } catch (err) {
      console.error(err);
      toast.error('Échec du téléchargement');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendReminder = async (facture: typeof factures[0]) => {
    setRemindingId(facture.id);
    try {
      await sendInvoiceReminder(facture.id);
      toast.success('Email de rappel envoyé au client');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Échec d'envoi de l'email de rappel";
      toast.error(message);
    } finally {
      setRemindingId(null);
    }
  };

  const stats = {
    total: factures.length,
    enAttente: factures.filter((f) => f.statutPaiement === StatutPaiement.EN_ATTENTE).length,
    payee: factures.filter((f) => f.statutPaiement === StatutPaiement.PAYEE).length,
    montantTotal: factures.reduce((sum, f) => sum + f.montantTotal, 0),
    montantPaye: paiements.reduce((sum, p) => sum + p.montant, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des factures</h1>
          <p className="text-slate-500">Suivez les factures et les paiements</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total factures</p>
                <p className="text-xl font-bold">{stats.total}</p>
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
                <p className="text-sm text-slate-500">En attente</p>
                <p className="text-xl font-bold">{stats.enAttente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Payées</p>
                <p className="text-xl font-bold">{stats.payee}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Montant total</p>
                <p className="text-xl font-bold">{stats.montantTotal.toLocaleString('fr-FR')} €</p>
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
                placeholder="Rechercher une facture..."
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
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date d'émission</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFactures.map((facture) => {
                const Icon = statutIcons[facture.statutPaiement];
                const montantPaye = getMontantPaye(facture.id);
                const montantRestant = facture.montantTotal - montantPaye;
                const isDownloading = downloadingId === facture.id;
                const isReminding = remindingId === facture.id;

                return (
                  <TableRow key={facture.id}>
                    <TableCell className="font-medium">{facture.numeroFacture}</TableCell>
                    <TableCell>{getClientName(facture.clientId)}</TableCell>
                    <TableCell>
                      {new Date(facture.dateEmission).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={statutColors[facture.statutPaiement]}>
                        <Icon className="w-3 h-3 mr-1" />
                        {facture.statutPaiement}
                      </Badge>
                      {facture.statutPaiement !== StatutPaiement.PAYEE && (
                        <span className="text-xs text-slate-500 block mt-1">
                          Reste: {montantRestant.toLocaleString('fr-FR')} €
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {facture.montantTotal.toLocaleString('fr-FR')} €
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailDialog(facture)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {facture.statutPaiement !== StatutPaiement.PAYEE && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-700"
                            onClick={() => handleSendReminder(facture)}
                            disabled={isReminding}
                          >
                            {isReminding ? (
                              <div className="w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin mr-1" />
                            ) : (
                              <Mail className="w-4 h-4 mr-1" />
                            )}
                            Relancer
                          </Button>
                        )}
                        {facture.statutPaiement !== StatutPaiement.PAYEE && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => openPaiementDialog(facture)}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Payer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadInvoice(facture)}
                          disabled={isDownloading}
                          aria-label={`Télécharger ${facture.numeroFacture}`}
                        >
                          {isDownloading ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
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
            <DialogTitle>Facture {selectedFacture?.numeroFacture}</DialogTitle>
            <DialogDescription>Détails de la facture</DialogDescription>
          </DialogHeader>
          {selectedFacture && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Client</Label>
                  <p className="font-medium">{getClientName(selectedFacture.clientId)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Date d'émission</Label>
                  <p className="font-medium">
                    {new Date(selectedFacture.dateEmission).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Statut</Label>
                  <p>
                    <Badge className={statutColors[selectedFacture.statutPaiement]}>
                      {selectedFacture.statutPaiement}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Montant total</Label>
                  <p className="font-medium text-lg">
                    {selectedFacture.montantTotal.toLocaleString('fr-FR')} €
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-slate-500">Historique des paiements</Label>
                {getPaiementsForFacture(selectedFacture.id).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaiementsForFacture(selectedFacture.id).map((paiement) => (
                        <TableRow key={paiement.id}>
                          <TableCell>
                            {new Date(paiement.datePaiement).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>{paiement.methode}</TableCell>
                          <TableCell>{paiement.reference}</TableCell>
                          <TableCell className="text-right">
                            {paiement.montant.toLocaleString('fr-FR')} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-slate-500 text-sm py-4">Aucun paiement enregistré</p>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Montant payé:</span>
                  <span>{getMontantPaye(selectedFacture.id).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium">Reste à payer:</span>
                  <span className="text-lg font-bold">
                    {(selectedFacture.montantTotal - getMontantPaye(selectedFacture.id)).toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadInvoice(selectedFacture)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger en PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Paiement Dialog */}
      <Dialog open={isPaiementDialogOpen} onOpenChange={setIsPaiementDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              {selectedFacture && (
                <>
                  Facture {selectedFacture.numeroFacture} — Reste à payer :{' '}
                  <strong>
                    {(selectedFacture.montantTotal - getMontantPaye(selectedFacture.id)).toLocaleString('fr-FR')} €
                  </strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant (€)</Label>
              <Input
                id="montant"
                type="number"
                value={paiementForm.montant}
                onChange={(e) => setPaiementForm({ ...paiementForm, montant: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="methode">Méthode de paiement</Label>
              <Select
                value={paiementForm.methode}
                onValueChange={(value) => setPaiementForm({ ...paiementForm, methode: value as MethodePaiement })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARTE">Carte bancaire</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={paiementForm.reference}
                onChange={(e) => setPaiementForm({ ...paiementForm, reference: e.target.value })}
                placeholder="Numéro de transaction..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaiementDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddPaiement} className="bg-green-600 hover:bg-green-700">
              <CreditCard className="w-4 h-4 mr-2" />
              Enregistrer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
