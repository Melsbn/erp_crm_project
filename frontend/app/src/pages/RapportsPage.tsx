import { useState, useRef } from 'react';
import { useStore } from '@/store';
import { TypeRapport } from '@/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Download, FileText, TrendingUp, Users, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const typeIcons = {
  [TypeRapport.VENTES]: TrendingUp,
  [TypeRapport.CLIENTS]: Users,
  [TypeRapport.PERFORMANCE]: Package,
};

/** Capture a DOM element as a base64 PNG */
async function captureElement(el: HTMLElement): Promise<string> {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

export function RapportsPage() {
  const { t, i18n } = useTranslation();
  const { rapports, commandes, clients, produits, users, addRapport } = useStore();
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-US';
  const reportTypeLabel = (type: TypeRapport) => t(`statusLabels.reportType.${type}`);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ventes');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Refs on the HIDDEN always-mounted chart clones (used for PDF capture)
  const captureVentesLineRef  = useRef<HTMLDivElement>(null);
  const captureVentesBarRef   = useRef<HTMLDivElement>(null);
  const captureClientsPieRef  = useRef<HTMLDivElement>(null);
  const capturePerfBarRef     = useRef<HTMLDivElement>(null);
  const captureProduitBarRef  = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    type: 'VENTES' as TypeRapport,
    periode: {
      dateDebut: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      dateFin: new Date().toISOString().split('T')[0],
    },
  });

  const filteredRapports = rapports.filter((r) =>
    reportTypeLabel(r.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Chart data ─────────────────────────────────────────────────────────────

  const ventesData = [
    { mois: t('pages.reports.months.jan'), montant: 15000, commandes: 12 },
    { mois: t('pages.reports.months.feb'), montant: 18000, commandes: 15 },
    { mois: t('pages.reports.months.mar'), montant: 22000, commandes: 18 },
    { mois: t('pages.reports.months.apr'), montant: 19000, commandes: 16 },
    { mois: t('pages.reports.months.may'), montant: 25000, commandes: 22 },
    { mois: t('pages.reports.months.jun'), montant: 28000, commandes: 25 },
  ];

  const clientTypeData = [
    { name: t('pages.reports.individuals'), value: clients.filter((c) => c.type === 'PARTICULIER').length },
    { name: t('pages.reports.businesses'),  value: clients.filter((c) => c.type === 'ENTREPRISE').length },
  ];

  const produitData = produits.slice(0, 5).map((p) => ({
    name: p.nom,
    ventes: Math.floor(Math.random() * 50) + 10,
  }));

  const performanceData = users
    .filter((u) => u.role !== 'ADMIN')
    .map((u) => ({
      name: `${u.prenom} ${u.nom}`,
      ventes: Math.floor(Math.random() * 20) + 5,
      montant: Math.floor(Math.random() * 50000) + 10000,
    }));

  // ─── PDF generation ────────────────────────────────────────────────────────

  const handleDownloadReport = async (rapport: typeof rapports[0]) => {
    setDownloadingId(rapport.id);
    try {
      // All refs point to always-mounted elements — capture directly, no tab switching needed
      const [imgVentesLine, imgVentesBar, imgClientsPie, imgPerfBar, imgProduitBar] =
        await Promise.all([
          captureVentesLineRef.current  ? captureElement(captureVentesLineRef.current)  : Promise.resolve(''),
          captureVentesBarRef.current   ? captureElement(captureVentesBarRef.current)   : Promise.resolve(''),
          captureClientsPieRef.current  ? captureElement(captureClientsPieRef.current)  : Promise.resolve(''),
          capturePerfBarRef.current     ? captureElement(capturePerfBarRef.current)     : Promise.resolve(''),
          captureProduitBarRef.current  ? captureElement(captureProduitBarRef.current)  : Promise.resolve(''),
        ]);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = pdf.internal.pageSize.getWidth();
      const PH = pdf.internal.pageSize.getHeight();
      const M  = 14;

      const BLUE:  [number, number, number] = [37,  99,  235];
      const DARK:  [number, number, number] = [15,  23,  42 ];
      const GRAY:  [number, number, number] = [100, 116, 139];
      const WHITE: [number, number, number] = [255, 255, 255];
      const LIGHT: [number, number, number] = [248, 250, 252];

      const fromDate = new Date(rapport.periode.dateDebut);
      const toDate   = new Date(rapport.periode.dateFin);
      toDate.setHours(23, 59, 59, 999);
      const periodLabel = t('pages.reports.periodLabel', {
        from: fromDate.toLocaleDateString(locale),
        to: toDate.toLocaleDateString(locale),
      });

      // ── Helpers ────────────────────────────────────────────────────────────

      const addHeader = (title: string, subtitle: string) => {
        pdf.setFillColor(...BLUE);
        pdf.rect(0, 0, PW, 38, 'F');
        pdf.setTextColor(...WHITE);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text(title, M, 18);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(196, 215, 255);
        pdf.text(subtitle, M, 28);
      };

      const addFooter = (pageNum: number, total: number) => {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(M, PH - 14, PW - M, PH - 14);
        pdf.setFontSize(7.5);
        pdf.setTextColor(...GRAY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(t('pages.reports.pdf.confidential'), M, PH - 8);
        pdf.text(`Page ${pageNum} / ${total}`, PW - M, PH - 8, { align: 'right' });
      };

      const addSectionLabel = (text: string, y: number) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...DARK);
        pdf.text(text, M, y);
        pdf.setDrawColor(...BLUE);
        pdf.setLineWidth(1.2);
        pdf.line(M, y + 1.5, M + 35, y + 1.5);
        pdf.setLineWidth(0.3);
      };

      const addKpis = (
        items: Array<{ label: string; value: string; color: [number, number, number] }>,
        y: number
      ) => {
        const w = (PW - M * 2 - (items.length - 1) * 3) / items.length;
        items.forEach((item, i) => {
          const x = M + i * (w + 3);
          pdf.setFillColor(...WHITE);
          pdf.roundedRect(x, y, w, 20, 3, 3, 'F');
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(x, y, w, 20, 3, 3, 'S');
          pdf.setFillColor(...item.color);
          pdf.rect(x, y, 3, 20, 'F');
          pdf.setTextColor(...GRAY);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.text(item.label, x + 6, y + 8);
          pdf.setTextColor(...DARK);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.text(item.value, x + 6, y + 16);
        });
      };

      const addChartImage = (
        imgData: string,
        refEl: HTMLElement | null,
        x: number, y: number, maxW: number, maxH: number
      ): number => {
        if (!imgData || !refEl) return y;
        const ratio  = refEl.offsetHeight / refEl.offsetWidth;
        const drawW  = maxW;
        const drawH  = Math.min(drawW * ratio, maxH);
        pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
        return y + drawH;
      };

      const addDataTable = (headers: string[], rows: string[][], y: number): number => {
        const colW = (PW - M * 2) / headers.length;
        const rowH = 7;
        pdf.setFillColor(...BLUE);
        pdf.rect(M, y, PW - M * 2, rowH, 'F');
        pdf.setTextColor(...WHITE);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        headers.forEach((h, i) => pdf.text(h, M + i * colW + 2, y + 5));
        rows.forEach((row, ri) => {
          const ry = y + rowH + ri * rowH;
          if (ri % 2 === 0) pdf.setFillColor(...LIGHT);
          else              pdf.setFillColor(...WHITE);
          pdf.rect(M, ry, PW - M * 2, rowH, 'F');
          pdf.setTextColor(...DARK);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          row.forEach((cell, ci) => {
            const max = Math.floor(colW / 2);
            const txt = cell.length > max ? cell.slice(0, max - 1) + '…' : cell;
            pdf.text(txt, M + ci * colW + 2, ry + 5);
          });
        });
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.rect(M, y, PW - M * 2, rowH * (rows.length + 1), 'S');
        return y + rowH * (rows.length + 1);
      };

      // ── PAGE 1 : Cover ─────────────────────────────────────────────────────

      pdf.setFillColor(...LIGHT);
      pdf.rect(0, 0, PW, PH, 'F');
      pdf.setFillColor(...BLUE);
      pdf.rect(0, 0, PW, 90, 'F');

      pdf.setTextColor(...WHITE);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(26);
      pdf.text(`${t('navigation.reports')} ${reportTypeLabel(rapport.type)}`, M, 42);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(196, 215, 255);
      pdf.text(periodLabel, M, 56);
      pdf.setFontSize(9);
      pdf.setTextColor(160, 195, 255);
      pdf.text(`${t('common.generatedOn')} ${new Date(rapport.dateGeneration).toLocaleDateString(locale)}`, M, 68);

      pdf.setFillColor(...WHITE);
      pdf.roundedRect(M, 100, PW - M * 2, 70, 5, 5, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(M, 100, PW - M * 2, 70, 5, 5, 'S');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...DARK);
      pdf.text(t('common.information'), M + 8, 114);
      [
        [t('pages.reports.pdf.reportType'), reportTypeLabel(rapport.type)],
        [t('pages.reports.pdf.identifier'), rapport.id],
        [t('pages.reports.pdf.coveredPeriod'), periodLabel],
        [t('pages.reports.generatedDate'), new Date(rapport.dateGeneration).toLocaleDateString(locale)],
      ].forEach(([k, v], i) => {
        const iy = 124 + i * 11;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...GRAY);
        pdf.text(k, M + 8, iy);
        pdf.setTextColor(...DARK);
        pdf.text(v, M + 65, iy);
      });

      addFooter(1, 3);

      // ── PAGE 2 : Charts ────────────────────────────────────────────────────

      pdf.addPage();
      pdf.setFillColor(...WHITE);
      pdf.rect(0, 0, PW, PH, 'F');

      if (rapport.type === TypeRapport.VENTES) {
        const periodOrders = commandes.filter((c) => {
          const d = new Date(c.dateCommande);
          return d >= fromDate && d <= toDate;
        });
        const totalRevenue = periodOrders.reduce((s, c) => s + c.montantTotal, 0);
        const avgOrder     = periodOrders.length > 0 ? totalRevenue / periodOrders.length : 0;
        const thisMonth    = periodOrders.filter(
          (c) => new Date(c.dateCommande).getMonth() === new Date().getMonth()
        ).length;

        addHeader(t('pages.reports.pdf.salesAnalysis'), periodLabel);
        addKpis([
          { label: t('pages.reports.totalRevenue'), value: `${totalRevenue.toLocaleString(locale)} €`, color: [37, 99, 235] },
          { label: t('pages.reports.orderCountLabel'), value: String(periodOrders.length), color: [16, 185, 129] },
          { label: t('pages.reports.avgBasket'), value: `${Math.round(avgOrder).toLocaleString(locale)} €`, color: [139, 92, 246] },
          { label: t('pages.reports.pdf.thisMonth'), value: String(thisMonth), color: [245, 158, 11] },
        ], 44);

        addSectionLabel(t('pages.reports.salesEvolution'), 74);
        let nextY = addChartImage(imgVentesLine, captureVentesLineRef.current, M, 78, PW - M * 2, 68);

        addSectionLabel(t('pages.reports.orderCount'), nextY + 6);
        addChartImage(imgVentesBar, captureVentesBarRef.current, M, nextY + 10, PW - M * 2, 68);

        addFooter(2, 3);

        pdf.addPage();
        pdf.setFillColor(...WHITE);
        pdf.rect(0, 0, PW, PH, 'F');
        addHeader(t('pages.reports.pdf.orderDetails'), periodLabel);
        addSectionLabel(t('pages.reports.pdf.ordersInPeriod'), 46);
        const tableRows = periodOrders.slice(0, 28).map((c) => [
          c.id.slice(0, 10),
          new Date(c.dateCommande).toLocaleDateString(locale),
          c.statut,
          c.clientId?.slice(0, 10) || '—',
          `${c.montantTotal.toFixed(2)} €`,
        ]);
        const afterTable = addDataTable([t('pages.reports.pdf.orderId'), t('common.date'), t('common.status'), t('pages.reports.pdf.clientId'), t('common.amount')], tableRows, 50);
        if (periodOrders.length > 28) {
          pdf.setFontSize(7.5);
          pdf.setTextColor(...GRAY);
          pdf.text(t('pages.reports.pdf.hiddenOrders', { count: periodOrders.length - 28 }), M, afterTable + 5);
        }
        addFooter(3, 3);

      } else if (rapport.type === TypeRapport.CLIENTS) {
        const periodClients = clients.filter((c) => {
          const d = new Date(c.dateCreation);
          return d >= fromDate && d <= toDate;
        });

        addHeader(t('pages.reports.pdf.clientAnalysis'), periodLabel);
        addKpis([
          { label: t('pages.reports.totalClients'), value: String(clients.length), color: [37, 99, 235] },
          { label: t('pages.reports.pdf.newClients'), value: String(periodClients.length), color: [16, 185, 129] },
          { label: t('pages.reports.individuals'), value: String(clients.filter(c => c.type === 'PARTICULIER').length), color: [139, 92, 246] },
          { label: t('pages.reports.businesses'), value: String(clients.filter(c => c.type === 'ENTREPRISE').length), color: [245, 158, 11] },
        ], 44);

        addSectionLabel(t('pages.reports.clientDistribution'), 74);
        addChartImage(imgClientsPie, captureClientsPieRef.current, M, 78, PW - M * 2, 100);

        addFooter(2, 3);

        pdf.addPage();
        pdf.setFillColor(...WHITE);
        pdf.rect(0, 0, PW, PH, 'F');
        addHeader(t('pages.reports.pdf.clientList'), periodLabel);
        addSectionLabel(t('pages.reports.pdf.clientsInPeriod'), 46);
        addDataTable(
          [t('common.name'), t('common.email'), t('common.type'), t('common.company'), t('pages.reports.pdf.creationDate')],
          periodClients.slice(0, 28).map((c) => [
            `${c.prenom} ${c.nom}`,
            c.email,
            c.type,
            c.entreprise || '—',
            new Date(c.dateCreation).toLocaleDateString(locale),
          ]),
          50
        );
        addFooter(3, 3);

      } else {
        const periodOrders = commandes.filter((c) => {
          const d = new Date(c.dateCommande);
          return d >= fromDate && d <= toDate;
        });
        const userMap = new Map(users.map(u => [u.id, `${u.prenom} ${u.nom}`]));
        const grouped = new Map<string, { count: number; amount: number; name: string }>();
        for (const order of periodOrders) {
          const cur = grouped.get(order.userId) || { count: 0, amount: 0, name: userMap.get(order.userId) || t('pages.reports.pdf.unknownEmployee') };
          grouped.set(order.userId, { ...cur, count: cur.count + 1, amount: cur.amount + order.montantTotal });
        }
        const perfData = Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);

        addHeader(t('pages.reports.performanceReport'), periodLabel);
        addKpis([
          { label: t('pages.reports.pdf.activeEmployees'), value: String(perfData.length), color: [37, 99, 235] },
          { label: t('pages.reports.pdf.processedOrders'), value: String(periodOrders.length), color: [16, 185, 129] },
          { label: t('pages.reports.pdf.totalTurnover'), value: `${periodOrders.reduce((s, c) => s + c.montantTotal, 0).toLocaleString(locale)} €`, color: [139, 92, 246] },
        ], 44);

        addSectionLabel(t('pages.reports.employeePerformance'), 74);
        const nextY = addChartImage(imgPerfBar, capturePerfBarRef.current, M, 78, PW - M * 2, 68);

        addSectionLabel(t('pages.reports.topProducts'), nextY + 6);
        addChartImage(imgProduitBar, captureProduitBarRef.current, M, nextY + 10, PW - M * 2, 68);

        addFooter(2, 3);

        pdf.addPage();
        pdf.setFillColor(...WHITE);
        pdf.rect(0, 0, PW, PH, 'F');
        addHeader(t('pages.reports.pdf.employeeRanking'), periodLabel);
        addSectionLabel(t('pages.reports.pdf.employeeDetails'), 46);
        addDataTable(
          ['#', t('common.employee'), t('pages.reports.orderCountLabel'), t('pages.reports.pdf.totalTurnover'), t('pages.reports.avgBasket')],
          perfData.map((e, i) => [
            String(i + 1),
            e.name,
            String(e.count),
            `${e.amount.toFixed(2)} €`,
            e.count > 0 ? `${(e.amount / e.count).toFixed(2)} €` : '—',
          ]),
          50
        );
        addFooter(3, 3);
      }

      pdf.save(`Report-${reportTypeLabel(rapport.type)}-${rapport.id}.pdf`);
      toast.success(t('pages.reports.downloadSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('pages.reports.downloadError'));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerate = async () => {
    try {
      await addRapport({
        type: formData.type,
        dateGeneration: new Date().toISOString(),
        periode: formData.periode,
        userId: '1',
      });
      setIsAddDialogOpen(false);
      toast.success(t('pages.reports.generateSuccess'));
    } catch {
      toast.error(t('pages.reports.generateError'));
    }
  };

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/*
        ── HIDDEN CAPTURE LAYER ─────────────────────────────────────────────────
        These charts are always mounted and rendered (Recharts needs a visible
        width to paint), but positioned off-screen so the user never sees them.
        html2canvas reads directly from these elements, bypassing any tab
        visibility issues entirely.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          width: '800px',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {/* Ventes – line chart */}
        <div ref={captureVentesLineRef} style={{ background: '#fff', padding: 8, width: 780 }}>
          <ResponsiveContainer width={780} height={300}>
            <LineChart data={ventesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip formatter={(v: number) => `${v.toLocaleString(locale)} €`} />
              <Line type="monotone" dataKey="montant" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ventes – bar chart */}
        <div ref={captureVentesBarRef} style={{ background: '#fff', padding: 8, width: 780 }}>
          <ResponsiveContainer width={780} height={300}>
            <BarChart data={ventesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commandes" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Clients – pie chart */}
        <div ref={captureClientsPieRef} style={{ background: '#fff', padding: 8, width: 780 }}>
          <ResponsiveContainer width={780} height={320}>
            <PieChart>
              <Pie
                data={clientTypeData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {clientTypeData.map((_, index) => (
                  <Cell key={`capture-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {clientTypeData.map((item, index) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                <span style={{ fontSize: 12, color: '#475569' }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance – employee bar chart */}
        <div ref={capturePerfBarRef} style={{ background: '#fff', padding: 8, width: 780 }}>
          <ResponsiveContainer width={780} height={300}>
            <BarChart data={performanceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(v: number) => `${v.toLocaleString(locale)} €`} />
              <Bar dataKey="montant" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance – top produits bar chart */}
        <div ref={captureProduitBarRef} style={{ background: '#fff', padding: 8, width: 780 }}>
          <ResponsiveContainer width={780} height={260}>
            <BarChart data={produitData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="ventes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Normal page UI ──────────────────────────────────────────────────── */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('pages.reports.title')}</h1>
          <p className="text-slate-500">{t('pages.reports.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('pages.reports.generate')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pages.reports.generateTitle')}</DialogTitle>
              <DialogDescription>{t('pages.reports.generateDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t('pages.reports.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as TypeRapport })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENTES">{t('pages.reports.salesReport')}</SelectItem>
                    <SelectItem value="CLIENTS">{t('pages.reports.clientsReport')}</SelectItem>
                    <SelectItem value="PERFORMANCE">{t('pages.reports.performanceReport')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateDebut">{t('pages.reports.startDate')}</Label>
                  <Input
                    id="dateDebut"
                    type="date"
                    value={formData.periode.dateDebut}
                    onChange={(e) =>
                      setFormData({ ...formData, periode: { ...formData.periode, dateDebut: e.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFin">{t('pages.reports.endDate')}</Label>
                  <Input
                    id="dateFin"
                    type="date"
                    value={formData.periode.dateFin}
                    onChange={(e) =>
                      setFormData({ ...formData, periode: { ...formData.periode, dateFin: e.target.value } })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700">{t('pages.reports.generate')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ventes"><TrendingUp className="w-4 h-4 mr-2" />{reportTypeLabel(TypeRapport.VENTES)}</TabsTrigger>
          <TabsTrigger value="clients"><Users className="w-4 h-4 mr-2" />{reportTypeLabel(TypeRapport.CLIENTS)}</TabsTrigger>
          <TabsTrigger value="performance"><Package className="w-4 h-4 mr-2" />{reportTypeLabel(TypeRapport.PERFORMANCE)}</TabsTrigger>
        </TabsList>

        {/* VENTES */}
        <TabsContent value="ventes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{t('pages.reports.salesEvolution')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ventesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString(locale)} €`} />
                    <Line type="monotone" dataKey="montant" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('pages.reports.orderCount')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ventesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="commandes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>{t('pages.reports.salesSummary')}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">{t('pages.reports.totalRevenue')}</p>
                  <p className="text-2xl font-bold">
                    {commandes.reduce((sum, c) => sum + c.montantTotal, 0).toLocaleString(locale)} €
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">{t('pages.reports.orderCountLabel')}</p>
                  <p className="text-2xl font-bold">{commandes.length}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">{t('pages.reports.avgBasket')}</p>
                  <p className="text-2xl font-bold">
                    {commandes.length > 0
                      ? Math.round(commandes.reduce((sum, c) => sum + c.montantTotal, 0) / commandes.length).toLocaleString(locale)
                      : 0} €
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">{t('pages.reports.currentMonthOrders')}</p>
                  <p className="text-2xl font-bold">
                    {commandes.filter((c) => new Date(c.dateCommande).getMonth() === new Date().getMonth()).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLIENTS */}
        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{t('pages.reports.clientDistribution')}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {clientTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {clientTypeData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm text-slate-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('pages.reports.clientStats')}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">{t('pages.reports.totalClients')}</p>
                    <p className="text-2xl font-bold">{clients.length}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">{t('pages.reports.individuals')}</p>
                    <p className="text-2xl font-bold">{clients.filter((c) => c.type === 'PARTICULIER').length}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">{t('pages.reports.businesses')}</p>
                    <p className="text-2xl font-bold">{clients.filter((c) => c.type === 'ENTREPRISE').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('pages.reports.employeePerformance')}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString(locale)} €`} />
                  <Bar dataKey="montant" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('pages.reports.topProducts')}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={produitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ventes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generated Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('pages.reports.generatedReports')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRapports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pages.reports.type')}</TableHead>
                  <TableHead>{t('pages.reports.generatedDate')}</TableHead>
                  <TableHead>{t('common.period')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRapports.map((rapport) => {
                  const Icon = typeIcons[rapport.type];
                  const isLoading = downloadingId === rapport.id;
                  return (
                    <TableRow key={rapport.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{reportTypeLabel(rapport.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(rapport.dateGeneration).toLocaleDateString(locale)}
                      </TableCell>
                      <TableCell>
                        {t('pages.reports.periodLabel', {
                          from: new Date(rapport.periode.dateDebut).toLocaleDateString(locale),
                          to: new Date(rapport.periode.dateFin).toLocaleDateString(locale),
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadReport(rapport)}
                          disabled={isLoading}
                          aria-label={t('pages.reports.reportDownloadLabel', { type: reportTypeLabel(rapport.type) })}
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>{t('pages.reports.noReports')}</p>
              <p className="text-sm">{t('pages.reports.noReportsHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
