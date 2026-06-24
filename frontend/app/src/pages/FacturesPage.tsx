import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import type { Facture, LigneCommande } from '@/types';
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

type InvoicePdfLabels = {
  companyName: string;
  companyAddress: string;
  companyContact: string;
  invoiceBadge: string;
  billedTo: string;
  clientId: string;
  issueDate: string;
  status: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  billedProducts: string;
  product: string;
  quantityShort: string;
  unitPrice: string;
  emptyProducts: string;
  paymentHistory: string;
  paymentMethod: string;
  reference: string;
  emptyPayments: string;
  totalBeforeTax: string;
  vat: string;
  totalWithTax: string;
  alreadyPaid: string;
  balanceDue: string;
  footerNote: string;
  iban: string;
  bic: string;
  date: string;
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

// ─── PDF builder ──────────────────────────────────────────────────────────────
function generateInvoicePdf(
  facture: Facture,
  clientName: string,
  lignes: Array<LigneCommande & { produitNom: string }>,
  paiements: Array<{ id: string; datePaiement: string; methode: string; reference: string; montant: number }>,
  montantPaye: number,
  labels: InvoicePdfLabels,
  locale: string,
  getPaymentMethodLabel: (method: string) => string,
  getPaymentStatusLabel: (status: StatutPaiement) => string
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
  pdf.text(labels.companyName, M, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(186, 212, 255);
  pdf.text(labels.companyAddress, M, 28);
  pdf.text(labels.companyContact, M, 34);

  // "FACTURE" badge (right)
  pdf.setFillColor(255, 255, 255, 0.12 as any);
  pdf.roundedRect(PW - M - 42, 10, 42, 28, 4, 4, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(labels.invoiceBadge, PW - M - 21, 22, { align: 'center' });
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
  pdf.text(labels.billedTo, M + 5, infoY + 8);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...C.dark);
  pdf.text(clientName, M + 5, infoY + 17);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...C.gray);
  pdf.text(`${labels.clientId}: ${facture.clientId.slice(0, 12)}`, M + 5, infoY + 25);

  // Dates card
  const dateX = M + CW * 0.55 + 6;
  const dateW = CW - CW * 0.55 - 6;
  pdf.setFillColor(...C.light);
  pdf.roundedRect(dateX, infoY, dateW, 36, 4, 4, 'F');

  const dateRows = [
    [labels.issueDate,  new Date(facture.dateEmission).toLocaleDateString(locale)],
    [labels.status,     getPaymentStatusLabel(facture.statutPaiement)],
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
    if (k === labels.status) {
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
    { label: labels.totalAmount, value: `${facture.montantTotal.toLocaleString(locale)} €`, color: C.blue },
    { label: labels.amountPaid, value: `${montantPaye.toLocaleString(locale)} €`, color: C.green },
    { label: labels.amountDue, value: `${montantRestant.toLocaleString(locale)} €`, color: isPaid ? C.green : C.red },
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

  // ── Purchased products table ────────────────────────────────────────────────
  const productsTitleY = sumY + 32;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...C.dark);
  pdf.text(labels.billedProducts, M, productsTitleY);
  pdf.setDrawColor(...C.blue);
  pdf.setLineWidth(1.5);
  pdf.line(M, productsTitleY + 2, M + 38, productsTitleY + 2);
  pdf.setLineWidth(0.3);

  const productsStartY = productsTitleY + 8;
  const productCols = [84, 22, 34, 38];
  const productColX = [M, M + 84, M + 106, M + 140];
  const productHeaders = [labels.product, labels.quantityShort, labels.unitPrice, labels.totalAmount];
  const rowH = 8;

  pdf.setFillColor(...C.blue);
  pdf.rect(M, productsStartY, CW, rowH, 'F');
  pdf.setTextColor(...C.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  productHeaders.forEach((header, i) => {
    const isRight = i > 0;
    const tx = isRight ? productColX[i] + productCols[i] - 2 : productColX[i] + 2;
    pdf.text(header, tx, productsStartY + 5.5, { align: isRight ? 'right' : 'left' });
  });

  let curY = productsStartY;

  if (lignes.length === 0) {
    curY += rowH;
    pdf.setFillColor(...C.light);
    pdf.rect(M, curY, CW, rowH, 'F');
    pdf.setTextColor(...C.gray);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(labels.emptyProducts, M + CW / 2, curY + 5.5, { align: 'center' });
    curY += rowH;
  } else {
    lignes.forEach((ligne, index) => {
      curY += rowH;
      pdf.setFillColor(...(index % 2 === 0 ? C.light : C.white));
      pdf.rect(M, curY, CW, rowH, 'F');

      const cells = [
        ligne.produitNom,
        String(ligne.quantite),
        `${ligne.prixUnitaire.toLocaleString(locale)} €`,
        `${ligne.sousTotal.toLocaleString(locale)} €`,
      ];

      pdf.setTextColor(...C.dark);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      cells.forEach((cell, i) => {
        const isRight = i > 0;
        const tx = isRight ? productColX[i] + productCols[i] - 2 : productColX[i] + 2;
        const maxChars = i === 0 ? 40 : 14;
        const text = cell.length > maxChars ? `${cell.slice(0, maxChars - 1)}…` : cell;
        pdf.text(text, tx, curY + 5.5, { align: isRight ? 'right' : 'left' });
      });
    });
    curY += rowH;
  }

  pdf.setDrawColor(...C.border);
  pdf.setLineWidth(0.2);
  pdf.rect(M, productsStartY, CW, curY - productsStartY, 'S');

  // ── Payment history table ────────────────────────────────────────────────────
  const tableStartY = curY + 10;

  // Section title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...C.dark);
  pdf.text(labels.paymentHistory, M, tableStartY);
  pdf.setDrawColor(...C.blue);
  pdf.setLineWidth(1.5);
  pdf.line(M, tableStartY + 2, M + 50, tableStartY + 2);
  pdf.setLineWidth(0.3);

  const tY = tableStartY + 8;
  const cols = [40, 40, 60, 38]; // widths: date, méthode, référence, montant
  const colX = [M, M + 40, M + 80, M + 140];
  const headers = [labels.date, labels.paymentMethod, labels.reference, labels.totalAmount];
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

  curY = tY;

  if (paiements.length === 0) {
    curY += rowH;
    pdf.setFillColor(...C.light);
    pdf.rect(M, curY, CW, rowH, 'F');
    pdf.setTextColor(...C.gray);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(labels.emptyPayments, M + CW / 2, curY + 5.5, { align: 'center' });
    curY += rowH;
  } else {
    paiements.forEach((p, ri) => {
      curY += rowH;
      if (ri % 2 === 0) pdf.setFillColor(...C.light);
      else              pdf.setFillColor(...C.white);
      pdf.rect(M, curY, CW, rowH, 'F');

      const cells = [
        new Date(p.datePaiement).toLocaleDateString(locale),
        getPaymentMethodLabel(p.methode),
        p.reference || '—',
        `${p.montant.toLocaleString(locale)} €`,
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
    { label: labels.totalBeforeTax, value: `${(facture.montantTotal * 0.8).toFixed(2)} €`, bold: false },
    { label: labels.vat, value: `${(facture.montantTotal * 0.2).toFixed(2)} €`, bold: false },
    { label: labels.totalWithTax, value: `${facture.montantTotal.toFixed(2)} €`, bold: true },
    { label: labels.alreadyPaid, value: `${montantPaye.toFixed(2)} €`, bold: false },
    { label: labels.balanceDue, value: `${montantRestant.toFixed(2)} €`, bold: true },
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
  pdf.text(labels.footerNote, M, PH - 14);
  pdf.text(`${labels.iban}: FR76 0000 0000 0000 0000 0000 000  •  ${labels.bic}: XXXXXXXX`, M, PH - 9);
  pdf.text(facture.numeroFacture, PW - M, PH - 9, { align: 'right' });

  pdf.save(`${facture.numeroFacture}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FacturesPage() {
  const { t, i18n } = useTranslation();
  const { factures, clients, produits, lignesCommande, paiements, addPaiement, updateFacture, sendInvoiceReminder } = useStore();
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
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

  const getPaymentStatusLabel = (status: StatutPaiement) => t(`statusLabels.payment.${status}`);

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case MethodePaiement.CARTE:
        return t('pages.invoices.paymentMethods.card');
      case MethodePaiement.VIREMENT:
        return t('pages.invoices.paymentMethods.transfer');
      case MethodePaiement.ESPECES:
        return t('pages.invoices.paymentMethods.cash');
      default:
        return method;
    }
  };

  const getPaymentReferenceConfig = (method: MethodePaiement) => {
    switch (method) {
      case MethodePaiement.VIREMENT:
        return {
          isVisible: true,
          isRequired: true,
          label: t('pages.invoices.referenceFields.transfer.label'),
          placeholder: t('pages.invoices.referenceFields.transfer.placeholder'),
        };
      case MethodePaiement.CARTE:
        return {
          isVisible: true,
          isRequired: false,
          label: t('pages.invoices.referenceFields.card.label'),
          placeholder: t('pages.invoices.referenceFields.card.placeholder'),
        };
      case MethodePaiement.ESPECES:
        return {
          isVisible: false,
          isRequired: false,
          label: '',
          placeholder: '',
        };
      default:
        return {
          isVisible: true,
          isRequired: false,
          label: t('pages.invoices.reference'),
          placeholder: t('pages.invoices.transactionNumber'),
        };
    }
  };

  const filteredFactures = factures.filter(
    (facture) =>
      facture.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(facture.clientId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  function getClientName(id: string) {
    const client = clients.find((c) => c.id === id);
    return client ? `${client.prenom} ${client.nom}` : t('common.unknownClient');
  }

  const getPaiementsForFacture = (factureId: string) =>
    paiements.filter((p) => p.factureId === factureId);

  const getMontantPaye = (factureId: string) =>
    getPaiementsForFacture(factureId).reduce((sum, p) => sum + p.montant, 0);

  const getFactureLignes = (factureId: string) => {
    const facture = factures.find((item) => item.id === factureId);
    if (!facture) {
      return [];
    }

    return lignesCommande
      .filter((ligne) => ligne.commandeId === facture.commandeId)
      .map((ligne) => ({
        ...ligne,
        produitNom: produits.find((produit) => produit.id === ligne.produitId)?.nom || t('common.unknownProduct'),
      }));
  };

  const handleAddPaiement = async () => {
    if (!selectedFacture) return;
    const referenceConfig = getPaymentReferenceConfig(paiementForm.methode);
    const reference = referenceConfig.isVisible ? paiementForm.reference.trim() : '';
    if (referenceConfig.isRequired && !reference) {
      toast.error(t('pages.invoices.referenceRequired'));
      return;
    }
    const montantPaye = getMontantPaye(selectedFacture.id) + paiementForm.montant;
    const montantTotal = selectedFacture.montantTotal;
    let newStatut: StatutPaiement;
    if (montantPaye >= montantTotal)  newStatut = StatutPaiement.PAYEE;
    else if (montantPaye > 0)         newStatut = StatutPaiement.PARTIELLE;
    else                               newStatut = StatutPaiement.EN_ATTENTE;
    try {
      await addPaiement({
        ...paiementForm,
        reference,
        datePaiement: new Date().toISOString(),
        factureId: selectedFacture.id,
      });
      await updateFacture(selectedFacture.id, {
        statutPaiement: newStatut,
        datePaiement: montantPaye >= montantTotal ? new Date().toISOString() : undefined,
      });
      setIsPaiementDialogOpen(false);
      setPaiementForm({ montant: 0, methode: MethodePaiement.VIREMENT, reference: '' });
      toast.success(t('pages.invoices.paymentSuccess'));
    } catch {
      toast.error(t('pages.invoices.paymentError'));
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
        getFactureLignes(facture.id),
        getPaiementsForFacture(facture.id),
        getMontantPaye(facture.id),
        {
          companyName: t('pages.invoices.pdf.companyName'),
          companyAddress: t('pages.invoices.pdf.companyAddress'),
          companyContact: t('pages.invoices.pdf.companyContact'),
          invoiceBadge: t('navigation.invoices'),
          billedTo: t('pages.invoices.pdf.billedTo'),
          clientId: t('pages.invoices.pdf.clientId'),
          issueDate: t('pages.invoices.issueDate'),
          status: t('common.status'),
          totalAmount: t('pages.invoices.totalAmount'),
          amountPaid: t('pages.invoices.pdf.amountPaidCard'),
          amountDue: t('pages.invoices.pdf.amountDueCard'),
          billedProducts: t('pages.invoices.billedProducts'),
          product: t('pages.invoices.product'),
          quantityShort: t('common.quantityShort'),
          unitPrice: t('common.unitPrice'),
          emptyProducts: t('pages.invoices.pdf.emptyProducts'),
          paymentHistory: t('pages.invoices.paymentHistory'),
          paymentMethod: t('pages.invoices.paymentMethod'),
          reference: t('pages.invoices.reference'),
          emptyPayments: t('pages.invoices.noPayments'),
          totalBeforeTax: t('pages.invoices.pdf.totalBeforeTax'),
          vat: t('pages.invoices.pdf.vat'),
          totalWithTax: t('pages.invoices.pdf.totalWithTax'),
          alreadyPaid: t('pages.invoices.pdf.alreadyPaid'),
          balanceDue: t('pages.invoices.pdf.balanceDue'),
          footerNote: t('pages.invoices.pdf.footerNote'),
          iban: t('pages.invoices.pdf.iban'),
          bic: t('pages.invoices.pdf.bic'),
          date: t('common.date'),
        },
        locale,
        getPaymentMethodLabel,
        getPaymentStatusLabel
      );
      toast.success(t('pages.invoices.downloadSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('pages.invoices.downloadError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendReminder = async (facture: typeof factures[0]) => {
    setRemindingId(facture.id);
    try {
      await sendInvoiceReminder(facture.id);
      toast.success(t('pages.invoices.reminderSuccess'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('pages.invoices.reminderError');
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

  const referenceConfig = getPaymentReferenceConfig(paiementForm.methode);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('pages.invoices.title')}</h1>
          <p className="text-slate-500">{t('pages.invoices.subtitle')}</p>
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
                <p className="text-sm text-slate-500">{t('pages.invoices.totalInvoices')}</p>
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
                <p className="text-sm text-slate-500">{t('pages.invoices.pending')}</p>
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
                <p className="text-sm text-slate-500">{t('pages.invoices.paid')}</p>
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
                <p className="text-sm text-slate-500">{t('pages.invoices.totalAmount')}</p>
                <p className="text-xl font-bold">{stats.montantTotal.toLocaleString(locale)} €</p>
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
                placeholder={t('pages.invoices.search')}
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
                <TableHead>{t('pages.invoices.invoiceNumber')}</TableHead>
                <TableHead>{t('common.client')}</TableHead>
                <TableHead>{t('pages.invoices.issueDate')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.amount')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                      {new Date(facture.dateEmission).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statutColors[facture.statutPaiement]}>
                        <Icon className="w-3 h-3 mr-1" />
                        {getPaymentStatusLabel(facture.statutPaiement)}
                      </Badge>
                      {facture.statutPaiement !== StatutPaiement.PAYEE && (
                        <span className="text-xs text-slate-500 block mt-1">
                          {t('pages.invoices.remaining')}: {montantRestant.toLocaleString(locale)} €
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {facture.montantTotal.toLocaleString(locale)} €
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
                            {t('pages.invoices.remind')}
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
                            {t('pages.invoices.pay')}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadInvoice(facture)}
                          disabled={isDownloading}
                          aria-label={t('pages.invoices.downloadLabel', { invoice: facture.numeroFacture })}
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
            <DialogTitle>{t('navigation.invoices')} {selectedFacture?.numeroFacture}</DialogTitle>
            <DialogDescription>{t('pages.invoices.invoiceDetails')}</DialogDescription>
          </DialogHeader>
          {selectedFacture && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">{t('common.client')}</Label>
                  <p className="font-medium">{getClientName(selectedFacture.clientId)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('pages.invoices.issueDate')}</Label>
                  <p className="font-medium">
                    {new Date(selectedFacture.dateEmission).toLocaleDateString(locale)}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('common.status')}</Label>
                  <p>
                    <Badge className={statutColors[selectedFacture.statutPaiement]}>
                      {getPaymentStatusLabel(selectedFacture.statutPaiement)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">{t('pages.invoices.totalAmount')}</Label>
                  <p className="font-medium text-lg">
                    {selectedFacture.montantTotal.toLocaleString(locale)} €
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-slate-500">{t('pages.invoices.billedProducts')}</Label>
                {getFactureLignes(selectedFacture.id).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('pages.invoices.product')}</TableHead>
                        <TableHead className="text-right">{t('common.quantityShort')}</TableHead>
                        <TableHead className="text-right">{t('common.unitPrice')}</TableHead>
                        <TableHead className="text-right">{t('common.total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFactureLignes(selectedFacture.id).map((ligne) => (
                        <TableRow key={ligne.id}>
                          <TableCell>{ligne.produitNom}</TableCell>
                          <TableCell className="text-right">{ligne.quantite}</TableCell>
                          <TableCell className="text-right">{ligne.prixUnitaire.toLocaleString(locale)} €</TableCell>
                          <TableCell className="text-right">{ligne.sousTotal.toLocaleString(locale)} €</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-slate-500 text-sm py-4">{t('pages.invoices.noProducts')}</p>
                )}
              </div>

              <div>
                <Label className="text-slate-500">{t('pages.invoices.paymentHistory')}</Label>
                {getPaiementsForFacture(selectedFacture.id).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>{t('pages.invoices.paymentMethod')}</TableHead>
                        <TableHead>{t('pages.invoices.reference')}</TableHead>
                        <TableHead className="text-right">{t('common.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getPaiementsForFacture(selectedFacture.id).map((paiement) => (
                        <TableRow key={paiement.id}>
                          <TableCell>
                            {new Date(paiement.datePaiement).toLocaleDateString(locale)}
                          </TableCell>
                          <TableCell>{getPaymentMethodLabel(paiement.methode)}</TableCell>
                          <TableCell>{paiement.reference || '—'}</TableCell>
                          <TableCell className="text-right">
                            {paiement.montant.toLocaleString(locale)} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-slate-500 text-sm py-4">{t('pages.invoices.noPayments')}</p>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t('pages.invoices.paidAmount')}</span>
                  <span>{getMontantPaye(selectedFacture.id).toLocaleString(locale)} €</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium">{t('pages.invoices.amountDue')}</span>
                  <span className="text-lg font-bold">
                    {(selectedFacture.montantTotal - getMontantPaye(selectedFacture.id)).toLocaleString(locale)} €
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
                  {t('common.downloadPdf')}
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
            <DialogTitle>{t('pages.invoices.recordPayment')}</DialogTitle>
            <DialogDescription>
              {selectedFacture && (
                t('pages.invoices.paymentDialogDescription', {
                  invoice: selectedFacture.numeroFacture,
                  amount: `${(selectedFacture.montantTotal - getMontantPaye(selectedFacture.id)).toLocaleString(locale)} €`,
                })
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="montant">{t('pages.invoices.amountField')}</Label>
              <Input
                id="montant"
                type="number"
                value={paiementForm.montant}
                onChange={(e) => setPaiementForm({ ...paiementForm, montant: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="methode">{t('pages.invoices.paymentMethod')}</Label>
              <Select
                value={paiementForm.methode}
                onValueChange={(value) => {
                  const methode = value as MethodePaiement;
                  setPaiementForm({
                    ...paiementForm,
                    methode,
                    reference: methode === MethodePaiement.ESPECES ? '' : paiementForm.reference,
                  });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARTE">{t('pages.invoices.paymentMethods.card')}</SelectItem>
                  <SelectItem value="VIREMENT">{t('pages.invoices.paymentMethods.transfer')}</SelectItem>
                  <SelectItem value="ESPECES">{t('pages.invoices.paymentMethods.cash')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {referenceConfig.isVisible && (
              <div className="space-y-2">
                <Label htmlFor="reference">
                  {referenceConfig.label}
                  {referenceConfig.isRequired && <span className="text-red-600"> *</span>}
                </Label>
                <Input
                  id="reference"
                  value={paiementForm.reference}
                  onChange={(e) => setPaiementForm({ ...paiementForm, reference: e.target.value })}
                  placeholder={referenceConfig.placeholder}
                  required={referenceConfig.isRequired}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaiementDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddPaiement} className="bg-green-600 hover:bg-green-700">
              <CreditCard className="w-4 h-4 mr-2" />
              {t('pages.invoices.recordPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
