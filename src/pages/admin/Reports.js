import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Download, Calendar,
  ChevronLeft, ChevronRight, FileText, ArrowUpRight,
  Activity, Layers, RefreshCw, TableProperties, FilePieChart
} from 'lucide-react';
import {
  collection, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import {
  format, startOfYear, endOfYear, startOfMonth, endOfMonth,
  addMonths, subMonths, addYears, subYears, eachDayOfInterval,
  eachMonthOfInterval, isSameDay, isSameMonth
} from 'date-fns';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const C = {
  bg: '#F4F4F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F9F9F6',
  border: '#E8E8E2',
  borderDark: '#CFCFC5',
  ink: '#141412',
  inkMid: '#4A4A44',
  inkLight: '#8A8A80',
  inkFaint: '#BFBFB5',

  // Primary accent — slate teal
  p: '#0D7377',
  pSoft: '#EAF5F5',
  pLight: '#14BFBF',

  // Amber
  amber: '#D97706',
  amberSoft: '#FFFBEB',

  // Rose
  rose: '#DC2626',
  roseSoft: '#FEF2F2',

  // Blue-purple accent
  green: '#6D28D9',
  greenSoft: '#EDE9FE',

  // Blue
  blue: '#2563EB',
  blueSoft: '#EFF6FF',

  // Chart palette
  chart: ['#0D7377', '#14BFBF', '#D97706', '#2563EB', '#7C3AED'],
};

const PIE_COLORS = ['#0D7377', '#14BFBF', '#D97706', '#2563EB', '#7C3AED', '#7C3AED'];

const getServiceName = (tx) => tx.serviceType || tx.catalogueItem || tx.printType || tx.category || 'Other';

const s = {
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)',
  },
  label: {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: C.inkLight,
  },
  sectionTitle: {
    margin: 0, fontSize: 15, fontWeight: 700,
    color: C.ink, letterSpacing: '-0.02em',
  },
};

/* ─────────────────────────────────────────────
   CUSTOM TOOLTIP
───────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, prefix = 'RM ' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.ink, color: '#fff', borderRadius: 10,
      padding: '8px 14px', fontSize: 12.5, fontWeight: 600,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      <div style={{ color: C.inkFaint, fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          {p.name}: <strong>{typeof p.value === 'number' && p.name?.toLowerCase().includes('rev')
            ? `RM ${p.value.toFixed(2)}`
            : p.value
          }</strong>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   KPI CARD
───────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, icon: Icon, color, delay = 0, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    style={{ ...s.card, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={s.label}>{label}</span>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={color} strokeWidth={2.2} />
      </div>
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: '-0.04em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {trend !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 5,
            background: trend >= 0 ? C.greenSoft : C.roseSoft,
            color: trend >= 0 ? C.green : C.rose,
          }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        <span style={{ fontSize: 12, color: C.inkLight }}>{sub}</span>
      </div>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────
   SECTION WRAPPER
───────────────────────────────────────────── */
const Section = ({ title, icon: Icon, children, action, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    style={{ ...s.card, overflow: 'hidden' }}
  >
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 22px', borderBottom: `1px solid ${C.border}`,
      background: C.surfaceAlt,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {Icon && <Icon size={15} color={C.p} strokeWidth={2.2} />}
        <span style={s.sectionTitle}>{title}</span>
      </div>
      {action}
    </div>
    <div style={{ padding: '20px 22px' }}>{children}</div>
  </motion.div>
);

/* ─────────────────────────────────────────────
   PERIOD NAVIGATOR
───────────────────────────────────────────── */
const PeriodNav = ({ reportType, selectedDate, onPrev, onNext, onNow }) => {
  const label = reportType === 'monthly'
    ? format(selectedDate, 'MMMM yyyy')
    : format(selectedDate, 'yyyy');

  const isNow = reportType === 'monthly'
    ? isSameMonth(selectedDate, new Date())
    : format(selectedDate, 'yyyy') === format(new Date(), 'yyyy');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: C.surfaceAlt, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '4px 4px 4px 14px',
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em', minWidth: 130, textAlign: 'center' }}>
        {label}
      </span>
      <NavBtn icon={ChevronLeft} onClick={onPrev} />
      <NavBtn icon={ChevronRight} onClick={onNext} disabled={isNow} />
      {!isNow && (
        <button onClick={onNow} style={{
          padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`,
          background: C.surface, fontSize: 11.5, fontWeight: 700,
          color: C.p, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '0.02em',
        }}>NOW</button>
      )}
    </div>
  );
};

const NavBtn = ({ icon: Icon, onClick, disabled }) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    disabled={disabled}
    style={{
      width: 32, height: 32, borderRadius: 7, border: `1px solid ${C.border}`,
      background: C.surface, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: disabled ? C.inkFaint : C.inkMid, opacity: disabled ? 0.4 : 1,
    }}
  >
    <Icon size={14} strokeWidth={2.5} />
  </motion.button>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const ReportsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reportType, setReportType] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const q = query(collection(db, 'printJobs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        timestamp: d.data().createdAt?.toDate() || new Date(),
      })));
      setLoading(false);
    });
    return unsub;
  }, []);

  /* ── Analytics ── */
  const analytics = useMemo(() => {
    const startDate = reportType === 'monthly' ? startOfMonth(selectedDate) : startOfYear(selectedDate);
    const endDate = reportType === 'monthly' ? endOfMonth(selectedDate) : endOfYear(selectedDate);

    const filtered = transactions.filter(tx => tx.timestamp >= startDate && tx.timestamp <= endDate);

    const totalRevenue = filtered.reduce((s, tx) => s + Number(tx.price || 0), 0);
    const totalJobs = filtered.length;
    const totalPages = filtered.reduce((s, tx) => s + Number(tx.pages || 0), 0);
    const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;

    // Service distribution
    const serviceMap = {};
    filtered.forEach(tx => {
      const svc = getServiceName(tx);
      if (!serviceMap[svc]) serviceMap[svc] = { count: 0, revenue: 0 };
      serviceMap[svc].count++;
      serviceMap[svc].revenue += Number(tx.price || 0);
    });
    const topServices = Object.entries(serviceMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6)
      .map(([name, d]) => ({ name, ...d }));

    // Revenue over time chart data
    let timeChartData = [];
    if (reportType === 'monthly') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      timeChartData = days.map(day => {
        const dayTxs = filtered.filter(tx => isSameDay(tx.timestamp, day));
        return {
          label: format(day, 'd'),
          revenue: dayTxs.reduce((s, tx) => s + Number(tx.price || 0), 0),
          jobs: dayTxs.length,
        };
      });
    } else {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      timeChartData = months.map(month => {
        const mTxs = filtered.filter(tx => isSameMonth(tx.timestamp, month));
        return {
          label: format(month, 'MMM'),
          revenue: mTxs.reduce((s, tx) => s + Number(tx.price || 0), 0),
          jobs: mTxs.length,
        };
      });
    }

    // Status breakdown and payment activity
    const statusMap = {};
    const paymentMap = {};
    const activityLog = filtered.map(tx => {
      const status = tx.status || 'pending';
      const payment = tx.paymentStatus || 'unpaid';
      const service = getServiceName(tx);
      statusMap[status] = (statusMap[status] || 0) + 1;
      paymentMap[payment] = (paymentMap[payment] || 0) + 1;
      return {
        id: tx.id,
        date: format(tx.timestamp, 'dd MMM yyyy'),
        time: format(tx.timestamp, 'HH:mm'),
        customer: tx.customerName || 'Unknown',
        service,
        pages: tx.pages || 0,
        price: Number(tx.price || 0).toFixed(2),
        status,
        payment,
        action: `${service} order ${status}${payment === 'paid' ? ' • paid' : ''}`,
      };
    });

    // Pie chart data
    const pieData = topServices.map(s => ({ name: s.name, value: s.count }));

    return { totalRevenue, totalJobs, totalPages, avgJobValue, topServices, filtered, startDate, endDate, timeChartData, pieData, statusMap, paymentMap, activityLog };
  }, [transactions, selectedDate, reportType]);

  /* ── Navigation ── */
  const prev = () => setSelectedDate(reportType === 'monthly' ? subMonths(selectedDate, 1) : subYears(selectedDate, 1));
  const next = () => {
    const n = reportType === 'monthly' ? addMonths(selectedDate, 1) : addYears(selectedDate, 1);
    if (n <= new Date()) setSelectedDate(n);
  };

  /* ── Auth ── */
  const exportReport = (action) => {
    action === 'pdf' ? generatePDF() : exportCSV();
  };

  /* ── PDF ── */
  const generatePDF = async () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const title = reportType === 'monthly'
        ? `Monthly Report — ${format(selectedDate, 'MMMM yyyy')}`
        : `Annual Report — ${format(selectedDate, 'yyyy')}`;

      // Header bar
      doc.setFillColor(13, 115, 119);
      doc.rect(0, 0, 297, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PRESS BUSINESS ANALYTICS', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 220, 12);

      // Title
      doc.setTextColor(20, 20, 18);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 32);

      // KPIs
      autoTable(doc, {
        startY: 40,
        head: [['Total Revenue', 'Total Jobs', 'Total Pages', 'Avg Job Value']],
        body: [[
          `RM ${analytics.totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`,
          analytics.totalJobs.toString(),
          analytics.totalPages.toLocaleString(),
          `RM ${analytics.avgJobValue.toFixed(2)}`,
        ]],
        headStyles: { fillColor: [13, 115, 119], textColor: 255, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 12 },
        theme: 'grid',
      });

      // Top services
      if (analytics.topServices.length) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Services', 14, doc.lastAutoTable.finalY + 14);
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 18,
          head: [['Service', 'Jobs', 'Revenue']],
          body: analytics.topServices.map(s => [s.name, s.count, `RM ${s.revenue.toFixed(2)}`]),
          headStyles: { fillColor: [20, 191, 191], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
          theme: 'striped',
        });
      }

      // Transactions
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction History', 14, doc.lastAutoTable.finalY + 14);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 18,
        head: [['Date', 'Time', 'Customer', 'Service', 'Status', 'Payment', 'Pages', 'Price']],
        body: analytics.filtered.slice(0, 100).map(tx => [
          format(tx.timestamp, 'dd MMM yyyy'),
          format(tx.timestamp, 'HH:mm'),
          tx.customerName || '—',
          getServiceName(tx),
          tx.status || 'pending',
          tx.paymentStatus || 'unpaid',
          tx.pages || 0,
          `RM ${Number(tx.price || 0).toFixed(2)}`,
        ]),
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        columnStyles: { 7: { fontStyle: 'bold', textColor: [5, 150, 105] } },
        theme: 'grid',
      });

      // Page numbers
      const total = doc.internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 170);
        doc.text(`Page ${i} of ${total}`, 260, 200);
      }

      doc.save(`report-${format(selectedDate, reportType === 'monthly' ? 'yyyy-MM' : 'yyyy')}.pdf`);
      toast.success('PDF report downloaded');
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed');
    } finally {
      setGeneratingPDF(false);
    }
  };

  /* ── CSV ── */
  const exportCSV = () => {
    const headers = ['Date', 'Time', 'Customer', 'Service', 'Pages', 'Price (RM)'];
    const rows = analytics.filtered.map(tx => [
      format(tx.timestamp, 'dd/MM/yyyy'),
      format(tx.timestamp, 'HH:mm'),
      tx.customerName || '',
      getServiceName(tx),
      tx.pages || 0,
      Number(tx.price || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(selectedDate, reportType === 'monthly' ? 'yyyy-MM' : 'yyyy')}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 14,
    }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={26} color={C.p} />
      </motion.div>
      <p style={{ fontSize: 14, color: C.inkLight, fontWeight: 500 }}>Loading reports…</p>
    </div>
  );

  /* ── Render ── */
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: '"DM Sans", "IBM Plex Sans", system-ui, sans-serif',
      padding: '0 0 60px',
    }}>

      {/* ── STICKY NAV ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(244,244,240,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: C.p, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>
            Analytics
          </span>
          <span style={{ fontSize: 11, color: C.inkLight }}>& Reports</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Export buttons */}
          <ExportBtn
            label={generatingPDF ? 'Generating…' : 'PDF'}
            icon={FileText}
            color={C.p}
            onClick={() => exportReport('pdf')}
            disabled={generatingPDF}
          />
          <ExportBtn
            label="CSV"
            icon={TableProperties}
            color={C.blue}
            onClick={() => exportReport('csv')}
          />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 28px 0' }}>

        {/* ── PAGE HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: '-0.04em' }}>
              Business Reports
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.inkLight }}>
              {analytics.filtered.length} transactions · {reportType === 'monthly'
                ? format(selectedDate, 'MMMM yyyy')
                : format(selectedDate, 'yyyy')}
            </p>
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Report type toggle */}
            <div style={{
              display: 'flex', background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, gap: 2,
            }}>
              {['monthly', 'annual'].map(type => (
                <button key={type} onClick={() => setReportType(type)} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: reportType === type ? C.p : 'transparent',
                  color: reportType === type ? '#fff' : C.inkMid,
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.18s',
                  textTransform: 'capitalize',
                }}>{type}</button>
              ))}
            </div>

            <PeriodNav
              reportType={reportType}
              selectedDate={selectedDate}
              onPrev={prev}
              onNext={next}
              onNow={() => setSelectedDate(new Date())}
            />
          </div>
        </motion.div>

        {/* ── KPI GRID ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12, marginBottom: 20,
        }}>
          <KpiCard label="Total Revenue" value={`RM ${analytics.totalRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
            sub="this period" icon={DollarSign} color={C.green} delay={0} />
          <KpiCard label="Total Jobs" value={analytics.totalJobs}
            sub="transactions" icon={BarChart3} color={C.p} delay={0.05} />
          <KpiCard label="Pages Printed" value={analytics.totalPages.toLocaleString()}
            sub="total pages" icon={FileText} color={C.blue} delay={0.1} />
          <KpiCard label="Avg Job Value" value={`RM ${analytics.avgJobValue.toFixed(2)}`}
            sub="per transaction" icon={TrendingUp} color={C.amber} delay={0.15} />
        </div>

        {/* ── CHARTS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, marginBottom: 20 }}>

          {/* Revenue + Jobs Area Chart */}
          <Section title="Revenue Over Time" icon={TrendingUp} delay={0.2}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.timeChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.p} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.p} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.inkLight }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.inkLight }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="revenue" name="Revenue"
                  stroke={C.p} strokeWidth={2} fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Section>

          {/* Services Pie */}
          <Section title="Service Mix" icon={FilePieChart} delay={0.25}>
            {analytics.pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={analytics.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                      paddingAngle={2} dataKey="value">
                      {analytics.pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip prefix="" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  {analytics.pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: C.inkMid, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <span style={{ fontWeight: 700, color: C.ink }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.inkFaint, fontSize: 13 }}>No data</div>
            )}
          </Section>
        </div>

        {/* ── OPERATIONS ACTIVITY ── */}
        <Section title="Operations Activity" icon={Activity} delay={0.3} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            {Object.entries(analytics.statusMap).map(([status, count]) => (
              <div key={status} style={{ flex: '1 1 150px', padding: '14px 16px', borderRadius: 14, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{status}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{count}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analytics.activityLog.slice(0, 8).map((item, index) => (
              <div key={item.id || index} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '14px 16px', borderRadius: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{item.action}</div>
                  <div style={{ fontSize: 12, color: C.inkLight, marginTop: 4 }}>{item.customer} • {item.service} • {item.pages} pages</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight }}>{item.date}</div>
                  <div style={{ fontSize: 12, color: C.inkMid, marginTop: 4 }}>{item.time}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.status === 'completed' ? C.green : item.status === 'ready' ? C.p : C.amber, textTransform: 'uppercase' }}>{item.status}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.payment === 'paid' ? C.green : C.rose, textTransform: 'uppercase' }}>{item.payment}</span>
                </div>
              </div>
            ))}
            {analytics.activityLog.length > 8 && (
              <div style={{ textAlign: 'center', fontSize: 12, color: C.inkLight, padding: '10px 0' }}>
                Showing latest 8 operations of {analytics.activityLog.length}.
              </div>
            )}
          </div>
        </Section>

        {/* ── JOBS BAR CHART ── */}
        <Section title="Jobs Per Period" icon={BarChart3} delay={0.3} style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.timeChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barSize={reportType === 'monthly' ? 8 : 22}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.inkLight }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.inkLight }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip prefix="" />} />
              <Bar dataKey="jobs" name="Jobs" fill={C.pLight} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* ── TWO COLS: Top Services + Export ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, marginBottom: 20, marginTop: 20 }}>

          {/* Top Services */}
          <Section title="Top Services" icon={Layers} delay={0.35}>
            {analytics.topServices.length === 0 ? (
              <p style={{ fontSize: 13, color: C.inkFaint, textAlign: 'center', padding: '20px 0' }}>No services this period</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analytics.topServices.map((svc, i) => {
                  const pct = analytics.topServices[0].count > 0 ? (svc.count / analytics.topServices[0].count) * 100 : 0;
                  return (
                    <motion.div key={svc.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: PIE_COLORS[i % PIE_COLORS.length] + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: PIE_COLORS[i % PIE_COLORS.length],
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.inkMid, flexShrink: 0, marginLeft: 8 }}>{svc.count} jobs</span>
                        </div>
                        <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.5 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                            style={{ height: '100%', background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3 }}
                          />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.green, flexShrink: 0, minWidth: 72, textAlign: 'right' }}>
                        RM {svc.revenue.toFixed(2)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Export Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ ...s.card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{
              padding: '16px 22px', borderBottom: `1px solid ${C.border}`,
              background: C.surfaceAlt, display: 'flex', alignItems: 'center', gap: 9,
            }}>
              <Download size={15} color={C.p} strokeWidth={2.2} />
              <span style={s.sectionTitle}>Export Report</span>
            </div>
            <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 12.5, color: C.inkLight, lineHeight: 1.5 }}>
                Download this period's data as a formatted report or raw CSV for spreadsheet analysis.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <ExportCard
                  title="PDF Report"
                  desc="Formatted report with charts summary and full transaction list"
                  icon={FileText}
                  color={C.p}
                  onClick={() => exportReport('pdf')}
                  loading={generatingPDF}
                  loadingLabel="Generating…"
                />
                <ExportCard
                  title="CSV Export"
                  desc="Raw transaction data, ready for Excel or Google Sheets"
                  icon={TableProperties}
                  color={C.blue}
                  onClick={() => exportReport('csv')}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── TRANSACTION TABLE ── */}
        <Section
          title={`Transaction History (${Math.min(50, analytics.filtered.length)} of ${analytics.filtered.length})`}
          icon={BarChart3}
          delay={0.45}
        >
          <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: C.surfaceAlt, zIndex: 2 }}>
                  {['Date', 'Time', 'Customer', 'Service', 'Status', 'Payment', 'Pages', 'Price'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: h === 'Price' ? 'right' : 'left',
                      ...s.label, borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: C.inkFaint, fontSize: 13 }}>
                      No transactions found for this period
                    </td>
                  </tr>
                ) : analytics.filtered.slice(0, 100).map((tx, i) => (
                  <motion.tr
                    key={tx.id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.pSoft}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: C.ink, whiteSpace: 'nowrap' }}>
                      {format(tx.timestamp, 'dd MMM yyyy')}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.inkLight, fontSize: 12 }}>
                      {format(tx.timestamp, 'HH:mm')}
                    </td>
                    <td style={{ padding: '10px 14px', color: C.inkMid }}>{tx.customerName || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                        background: C.pSoft, color: C.p,
                      }}>{getServiceName(tx)}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                        background: tx.status === 'completed' ? C.greenSoft : tx.status === 'ready' ? C.pSoft : C.amberSoft,
                        color: tx.status === 'completed' ? C.green : tx.status === 'ready' ? C.p : C.amber,
                      }}>{tx.status || 'pending'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                        background: tx.paymentStatus === 'paid' ? C.greenSoft : C.roseSoft,
                        color: tx.paymentStatus === 'paid' ? C.green : C.rose,
                      }}>{tx.paymentStatus || 'unpaid'}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: C.inkMid, fontWeight: 600 }}>
                      {tx.pages || 0}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: C.green }}>
                      RM {Number(tx.price || 0).toFixed(2)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

    </div>
  );
};

/* ─── Small helpers ─── */
const ExportBtn = ({ label, icon: Icon, color, onClick, disabled }) => (
  <motion.button
    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
    onClick={onClick} disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${color}40`,
      background: color + '12', color, fontSize: 12.5, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
      fontFamily: 'inherit',
    }}
  >
    <Icon size={13} /> {label}
  </motion.button>
);

const ExportCard = ({ title, desc, icon: Icon, color, onClick, loading, loadingLabel }) => (
  <motion.button
    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={loading}
    style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surfaceAlt,
      cursor: loading ? 'wait' : 'pointer', textAlign: 'left', width: '100%',
      fontFamily: 'inherit', transition: 'border-color 0.18s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = color}
    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
  >
    <div style={{
      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
      background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {loading
        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw size={14} color={color} /></motion.div>
        : <Icon size={14} color={color} />}
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{loading ? loadingLabel : title}</div>
      <div style={{ fontSize: 11.5, color: C.inkLight, marginTop: 1 }}>{desc}</div>
    </div>
    {!loading && <ArrowUpRight size={13} color={C.inkFaint} style={{ marginLeft: 'auto' }} />}
  </motion.button>
);

export default ReportsPage;
