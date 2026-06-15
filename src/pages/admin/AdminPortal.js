import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, AlertCircle, Wallet, TrendingUp, ChevronRight,
  Printer, Users, FileText, Zap, Package, CheckCircle2,
  ArrowRight, CreditCard, Truck, Activity, BarChart2,
  ArrowUpRight, ArrowDownRight, RefreshCw, Bell,
  Search, Star, Hash, Sun, Settings, Grid, LayoutDashboard, Sparkles, X, Download, FileCode, Eye
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, serverTimestamp, orderBy, doc, updateDoc
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { toast } from 'react-hot-toast';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

/* ── DESIGN TOKENS ─────────────────────────────────────────────────── */
const D = {
  // Backgrounds — richer cool-white with depth
  bg:          '#F0F2FA',
  surface:     '#FFFFFF',
  surfaceUp:   '#FAFBFF',
  surfaceDown: '#EEF0F8',
  glass:       'rgba(255,255,255,0.7)',

  // Borders — visible, intentional
  border:      '#DDE3F0',
  borderBr:    '#C8D0E4',
  borderCard:  '#E2E8F5',

  // Text — higher contrast
  ink:         '#0B1120',
  inkMid:      '#374163',
  inkDim:      '#5A6480',
  inkFaint:    '#8E98B4',

  // Brand Palette — deeper, more saturated
  cyan:        '#0E7490',
  cyanDim:     '#0E749012',
  cyanGlow:    '#0E749025',
  cyanBorder:  '#0E749035',

  violet:      '#5B21B6',
  violetDim:   '#5B21B612',
  violetLight: '#7C3AED',
  violetBorder:'#5B21B630',

  rose:        '#BE123C',
  roseDim:     '#BE123C10',
  roseBorder:  '#BE123C30',

  amber:       '#B45309',
  amberDim:    '#B4530910',
  amberBorder: '#B4530930',

  emerald:     '#047857',
  emeraldDim:  '#04785710',
  emeraldBorder:'#04785730',

  blue:        '#1D4ED8',
  blueDim:     '#1D4ED810',
  blueBorder:  '#1D4ED830',

  indigo:      '#3730A3',
  indigoDim:   '#3730A312',

  coral:       '#E85D3A',

  // Gradients — richer, more directional
  gradHero:    'linear-gradient(135deg, #3B0D8F 0%, #0E7490 60%, #0B5565 100%)',
  gradCard:    'linear-gradient(145deg, #FFFFFF 0%, #F8F9FD 100%)',
  gradViolet:  'linear-gradient(135deg, #5B21B6 0%, #3730A3 100%)',
  gradCyan:    'linear-gradient(135deg, #0E7490 0%, #1D4ED8 100%)',
  gradEmerald: 'linear-gradient(135deg, #047857 0%, #0E7490 100%)',
  gradAmber:   'linear-gradient(135deg, #B45309 0%, #BE123C 100%)',
  gradRose:    'linear-gradient(135deg, #BE123C 0%, #5B21B6 100%)',
  gradIndigo:  'linear-gradient(135deg, #3730A3 0%, #5B21B6 100%)',

  // Typography — intentional pairing
  font:        '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
  fontMono:    '"IBM Plex Mono", "JetBrains Mono", monospace',
  fontDisplay: '"Plus Jakarta Sans", "DM Sans", system-ui, sans-serif',
};

const PIE_COLORS = [D.cyan, D.violet, D.rose, D.amber, D.emerald, D.blue, D.coral];

/* ── GLOBAL CSS ─────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: linear-gradient(${D.violet}, ${D.cyan}); border-radius: 10px; }

  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.5; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes shimmer-bar {
    0%   { opacity: 0.6; }
    50%  { opacity: 1; }
    100% { opacity: 0.6; }
  }

  .kpi-card:hover .kpi-icon { transform: scale(1.13) rotate(-5deg); }
  .kpi-icon { transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1); }

  .nav-btn { transition: all 0.22s ease; }
  .nav-btn:hover { background: rgba(91,33,182,0.07) !important; }

  .job-row:hover { background: ${D.surfaceUp} !important; }

  .card-glow-violet { box-shadow: 0 4px 24px -8px rgba(91,33,182,0.12), 0 0 0 1.5px ${D.violetBorder}; }
  .card-glow-cyan   { box-shadow: 0 4px 24px -8px rgba(14,116,144,0.12), 0 0 0 1.5px ${D.cyanBorder}; }
  .card-glow-emerald{ box-shadow: 0 4px 24px -8px rgba(4,120,87,0.12),  0 0 0 1.5px ${D.emeraldBorder}; }
  .card-glow-rose   { box-shadow: 0 4px 24px -8px rgba(190,18,60,0.12), 0 0 0 1.5px ${D.roseBorder}; }
  .card-glow-amber  { box-shadow: 0 4px 24px -8px rgba(180,83,9,0.12),  0 0 0 1.5px ${D.amberBorder}; }
  .card-glow-blue   { box-shadow: 0 4px 24px -8px rgba(29,78,216,0.12), 0 0 0 1.5px ${D.blueBorder}; }
`;

/* ── ANIMATED NUMBER ─────────────────────────────────────────────────── */
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    const duration = 1100;
    const start = performance.now();
    const from = display;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(from + (target - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <>{prefix}{formatted}{suffix}</>;
}

/* ── PULSE DOT ───────────────────────────────────────────────────────── */
const PulseDot = ({ color = D.cyan, size = 9 }) => (
  <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
    <span style={{
      position: 'absolute', inset: 0, borderRadius: '50%', background: color,
      animation: 'pulse-ring 1.7s cubic-bezier(0,0,0.2,1) infinite',
    }} />
    <span style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: color }} />
  </span>
);

/* ── KPI CARD ────────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, prefix = '', suffix = '', decimals = 0, icon: Icon, gradient, accent, accentBorder, delta, sub, delay = 0, onClick }) => (
  <motion.div
    className="kpi-card"
    initial={{ opacity: 0, y: 30, scale: 0.94 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -7, boxShadow: `0 36px 72px -18px ${accent}28, 0 0 0 2px ${accentBorder || accent + '40'}` }}
    onClick={onClick}
    style={{
      background: D.surface,
      border: `1.5px solid ${accentBorder || D.borderCard}`,
      borderRadius: 22,
      padding: '26px 24px 22px',
      cursor: onClick ? 'pointer' : 'default',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: D.font,
      boxShadow: `0 4px 20px -6px ${accent}14, 0 1px 3px rgba(0,0,0,0.05)`,
      transition: 'all 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
    }}
  >
    {/* Top gradient bar — thicker, more visible */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 5,
      background: gradient, borderRadius: '22px 22px 0 0',
    }} />

    {/* Left accent stripe */}
    <div style={{
      position: 'absolute', top: 5, left: 0, width: 3, bottom: 0,
      background: `linear-gradient(to bottom, ${accent}60, transparent)`,
    }} />

    {/* Ambient glow blob */}
    <div style={{
      position: 'absolute', top: -40, right: -30, width: 140, height: 140,
      background: accent, filter: 'blur(60px)', opacity: 0.09, borderRadius: '50%', pointerEvents: 'none',
    }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div className="kpi-icon" style={{
        width: 48, height: 48, borderRadius: 14,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 8px 20px ${accent}35`,
        border: `1px solid rgba(255,255,255,0.3)`,
      }}>
        <Icon size={21} color="#FFFFFF" strokeWidth={2.2} />
      </div>
      {delta !== undefined && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11.5, fontWeight: 700,
          color: delta >= 0 ? D.emerald : D.rose,
          background: delta >= 0 ? D.emeraldDim : D.roseDim,
          padding: '5px 10px', borderRadius: 20,
          fontFamily: D.fontMono,
          border: `1px solid ${delta >= 0 ? D.emeraldBorder : D.roseBorder}`,
        }}>
          {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(delta)}%
        </div>
      )}
    </div>

    <div style={{
      fontSize: 32, fontWeight: 800, color: D.ink,
      letterSpacing: '-0.045em', lineHeight: 1.1, marginBottom: 5,
      fontFamily: D.fontMono,
    }}>
      <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
    </div>
    <div style={{
      fontSize: 11, fontWeight: 700, color: D.inkDim,
      textTransform: 'uppercase', letterSpacing: '0.11em',
    }}>
      {label}
    </div>
    {sub && (
      <div style={{ fontSize: 12, color: D.inkFaint, marginTop: 5, fontWeight: 500 }}>
        {sub}
      </div>
    )}
  </motion.div>
);

/* ── TOOLTIP ─────────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.98)', border: `1.5px solid ${D.borderCard}`,
      borderRadius: 14, padding: '12px 16px', fontFamily: D.font,
      boxShadow: '0 20px 44px rgba(11,17,32,0.13)', backdropFilter: 'blur(20px)',
    }}>
      <div style={{ fontSize: 10.5, color: D.inkDim, marginBottom: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 14, fontWeight: 700, color: D.ink, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || D.cyan, display: 'inline-block', flexShrink: 0 }} />
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('rev')
            ? `RM ${p.value.toFixed(2)}`
            : p.value}
        </div>
      ))}
    </div>
  );
};

/* ── STATUS BADGE ────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = {
    completed: { color: D.emerald, bg: D.emeraldDim, border: D.emeraldBorder, label: 'Done' },
    printing:  { color: D.cyan,    bg: D.cyanDim,    border: D.cyanBorder,    label: 'Printing' },
    pending:   { color: D.amber,   bg: D.amberDim,   border: D.amberBorder,   label: 'Pending' },
    urgent:    { color: D.rose,    bg: D.roseDim,    border: D.roseBorder,    label: 'Urgent!' },
  };
  const s = cfg[status] || cfg.pending;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: 7,
      background: s.bg, color: s.color, fontFamily: D.fontMono,
      border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
};

/* ── CARD SHELL ──────────────────────────────────────────────────────── */
const Card = ({ children, style = {}, delay = 0, hover = true, accentBorder, accentColor }) => (
  <motion.div
    initial={{ opacity: 0, y: 26 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    whileHover={hover ? {
      y: -4,
      boxShadow: `0 32px 72px -16px ${accentColor || D.violet}18, 0 0 0 2px ${accentBorder || D.violetBorder}`,
    } : {}}
    style={{
      background: D.surface,
      border: `1.5px solid ${accentBorder || D.borderCard}`,
      borderRadius: 22,
      overflow: 'hidden',
      boxShadow: `0 2px 16px -4px ${accentColor || D.violet}0A, 0 1px 3px rgba(0,0,0,0.04)`,
      transition: 'all 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
      ...style,
    }}
  >
    {children}
  </motion.div>
);

/* ── SECTION HEADER ──────────────────────────────────────────────────── */
const CardHead = ({ title, sub, action, icon: Icon, accent = D.violet, gradient }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 26px', borderBottom: `1.5px solid ${D.borderCard}`,
    background: D.surfaceUp,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      {Icon && (
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: gradient || `${accent}16`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${accent}28`,
          boxShadow: `0 4px 12px ${accent}18`,
        }}>
          <Icon size={15} color={gradient ? '#fff' : accent} strokeWidth={2.3} />
        </div>
      )}
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: D.ink, fontFamily: D.font, letterSpacing: '-0.01em' }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: D.inkDim, fontWeight: 500, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
    {action}
  </div>
);

/* ── TOP SERVICES LIST ITEM ──────────────────────────────────────────── */
const ServiceRow = ({ name, count, max, rank, color, delay }) => {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      style={{ marginBottom: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {/* Rank badge */}
          <span style={{
            fontSize: 10, fontWeight: 900, color,
            background: `${color}14`,
            width: 24, height: 24, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: D.fontMono, flexShrink: 0,
            border: `1px solid ${color}28`,
          }}>
            {rank}
          </span>
          {/* Full service name — wraps if long */}
          <span style={{
            fontSize: 13, fontWeight: 700, color: D.ink,
            lineHeight: 1.35, wordBreak: 'break-word',
          }}>
            {name}
          </span>
        </div>
        {/* Count badge */}
        <span style={{
          fontSize: 13, fontWeight: 800, color: D.surface,
          background: color, padding: '3px 10px', borderRadius: 8,
          fontFamily: D.fontMono, flexShrink: 0, marginLeft: 10,
          boxShadow: `0 4px 10px ${color}30`,
        }}>
          {count}
        </span>
      </div>

      {/* Progress bar with percentage label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1, height: 6, background: D.surfaceDown,
          borderRadius: 6, overflow: 'hidden',
          border: `1px solid ${D.borderCard}`,
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: delay + 0.2, duration: 0.9, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 6,
              background: `linear-gradient(90deg, ${color}90, ${color})`,
            }}
          />
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: D.inkFaint,
          fontFamily: D.fontMono, width: 30, textAlign: 'right', flexShrink: 0,
        }}>
          {pct}%
        </span>
      </div>
    </motion.div>
  );
};

/* ── MAIN DASHBOARD ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [catalogueItems, setCatalogueItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'printJobs'), orderBy('createdAt', 'desc')),
      snap => {
        setJobs(snap.docs.map(d => ({
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date(),
        })));
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'catalogue'), orderBy('name')),
      snap => setCatalogueItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setCatalogueItems([])
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'adminNotifications'), orderBy('createdAt', 'desc')),
      snap => setNotifications(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        read: d.data().read ?? false,
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : d.data().createdAt || new Date(),
      }))),
      () => setNotifications([])
    );
    return unsub;
  }, []);

  const markNotificationRead = async (id) => {
    try {
      await updateDoc(doc(db, 'adminNotifications', id), { read: true });
    } catch (err) {
      toast.error('Could not mark notification read');
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!unread.length) return;
    try {
      await Promise.all(unread.map((n) => updateDoc(doc(db, 'adminNotifications', n.id), { read: true })));
      toast.success('All notifications marked read');
    } catch (err) {
      toast.error('Could not update notifications');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const recentNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  const displayJobs = useMemo(() => {
    return jobs;
  }, [jobs]);

  const stats = useMemo(() => {
    const active = displayJobs.filter(j => j.status !== 'completed' && j.status !== 'file_error' && j.status !== 'on_hold');
    const unpaid = displayJobs.filter(j => j.paymentStatus === 'unpaid');
    const today = displayJobs.filter(j => isSameDay(j.createdAt, new Date()));
    const todayCompleted = today.filter(j => j.status === 'completed');
    const todayRev = todayCompleted.reduce((s, j) => s + (Number(j.totalPrice || j.price) || 0), 0);
    const urgent = active.filter(j => j.priority === 'urgent');

    const revChart = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayJobs = displayJobs.filter(j => isSameDay(j.createdAt, day));
      return {
        label: format(day, 'EEE'),
        revenue: dayJobs.reduce((s, j) => s + (Number(j.totalPrice || j.price) || 0), 0),
        jobs: dayJobs.length,
      };
    });

    const statusMap = { completed: 0, pending: 0, processing: 0 };
    displayJobs.forEach(j => {
      const k = j.status === 'completed' ? 'completed' : j.status === 'processing' ? 'processing' : 'pending';
      statusMap[k] = (statusMap[k] || 0) + 1;
    });
    const statusChart = [
      { name: 'Completed', value: statusMap.completed, color: '#10B981' },
      { name: 'Pending', value: statusMap.pending, color: '#F59E0B' },
      { name: 'Processing', value: statusMap.processing, color: '#3B82F6' },
    ];

    const svcMap = {};
    displayJobs.forEach(j => { const k = j.serviceType || j.catalogueItem || j.printType || j.category || 'Print'; svcMap[k] = (svcMap[k] || 0) + 1; });
    const topServices = Object.entries(svcMap).sort(([, a], [, b]) => b - a).slice(0, 7)
      .map(([name, count]) => ({ name, count }));

    return {
      active: active.length,
      unpaid: unpaid.length,
      todayRev,
      urgent: urgent.length,
      total: displayJobs.length,
      revChart,
      statusChart,
      topServices,
      todayCompletedCount: todayCompleted.length,
      todayCount: today.length
    };
  }, [displayJobs]);

  /* ── LOADING ── */
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: D.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28,
      fontFamily: D.font,
    }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: D.gradHero, filter: 'blur(24px)', opacity: 0.4,
          animation: 'float 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'relative', width: 80, height: 80, borderRadius: '50%',
          background: D.gradHero, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'spin-slow 2.4s linear infinite',
        }}>
          <RefreshCw size={32} color="#fff" strokeWidth={2} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: D.ink, marginBottom: 8, fontFamily: D.fontDisplay }}>Loading Dashboard…</h2>
        <p style={{ fontSize: 14, color: D.inkDim, fontFamily: D.font }}>Connecting to live operations terminal</p>
      </div>
    </div>
  );

  /* ── MAIN RENDER ── */
  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: D.font, overflowX: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ══════════════════ TOP NAV ══════════════════ */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'sticky', top: 0, zIndex: 200,
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(30px) saturate(200%)',
          borderBottom: `1.5px solid ${D.borderCard}`,
          boxShadow: '0 2px 12px rgba(11,17,32,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(20px,4vw,60px)', height: 68,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: D.gradHero,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px rgba(91,33,182,0.38)`,
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <Printer size={19} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 900, fontFamily: D.fontDisplay,
              background: D.gradHero,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              Krishsan Tech Enterprise
            </div>
            <div style={{ fontSize: 10.5, color: D.inkDim, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              P & P Service Management
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', minWidth: 300, width: '400px', maxWidth: '100%' }}>
          <Search size={15} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: D.inkDim }} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders..."
            style={{
              width: '100%', padding: '11px 16px 11px 42px', borderRadius: 13,
              border: `1.5px solid ${D.borderCard}`, background: D.surfaceUp, color: D.ink,
              fontSize: 13.5, fontFamily: D.font, outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: D.cyanDim, border: `1px solid ${D.cyanBorder}`, padding: '6px 11px', borderRadius: 10 }}>
            <PulseDot color={D.cyan} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: D.cyan, letterSpacing: '0.1em', fontFamily: D.fontMono }}>LIVE</span>
          </div>

          <div style={{
            fontSize: 14.5, fontWeight: 600, fontFamily: D.fontMono, color: D.ink,
            background: D.surfaceDown, padding: '8px 14px', borderRadius: 11,
            letterSpacing: '-0.01em', border: `1px solid ${D.borderCard}`,
          }}>
            {format(time, 'HH:mm:ss')}
          </div>

          <button onClick={() => setNotifOpen(true)} style={{
            width: 40, height: 40, borderRadius: 11,
            border: `1.5px solid ${D.borderCard}`,
            background: D.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
          }}>
            <Bell size={16} color={D.inkDim} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5, minWidth: 18, height: 18,
                borderRadius: 999, background: D.rose, color: '#fff', fontSize: 10,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                fontWeight: 800, border: '2.5px solid white',
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </motion.nav>

      {/* ══════════════════ PAGE CONTENT ══════════════════ */}
      <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '32px 24px 80px' }}>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: D.gradHero,
            borderRadius: 26,
            padding: 'clamp(28px,4vw,44px) clamp(28px,4vw,52px)',
            marginBottom: 32,
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 28px 72px -16px rgba(59,13,143,0.45)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, margin: '0 0 12px', fontFamily: D.font, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Krishsan Tech Enterprise
              </p>
              <h1 style={{
                fontSize: 'clamp(1.8rem,3vw,2.5rem)', fontWeight: 900, color: '#fff',
                letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 8px', fontFamily: D.fontDisplay,
              }}>
                Printing & Photocopying Service Management
              </h1>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: 0, fontFamily: D.font }}>
                Real-time Operations Dashboard | Live System Sync
              </p>
            </div>
            <div style={{ textAlign: 'right', color: '#fff' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {format(time, 'EEEE, MMM dd, yyyy')}
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 18, marginBottom: 28,
        }}>
          <KpiCard label="Active Queue" value={stats.active} icon={Clock}
            gradient={D.gradCyan} accent={D.cyan} accentBorder={D.cyanBorder}
            sub="Jobs in progress" onClick={() => navigate('/admin/printing')} delay={0} />
          <KpiCard label="Pending Payments" value={stats.unpaid} icon={CreditCard}
            gradient={D.gradAmber} accent={D.amber} accentBorder={D.amberBorder}
            sub="Awaiting collection" delay={0.08} />
          <KpiCard label="Today's Revenue" value={`RM ${stats.todayRev.toFixed(2)}`} icon={Wallet}
            gradient={D.gradEmerald} accent={D.emerald} accentBorder={D.emeraldBorder}
            sub={`${stats.todayCompletedCount} jobs completed`} delay={0.16} />
          <KpiCard label="Completed Today" value={stats.todayCompletedCount} icon={CheckCircle2}
            gradient={D.gradIndigo} accent={D.indigo} accentBorder={D.violetBorder}
            sub="Orders completed" delay={0.24} />
          <KpiCard label="Total Orders" value={stats.total} icon={Hash}
            gradient={D.gradViolet} accent={D.violet} accentBorder={D.violetBorder}
            sub="All time" delay={0.32} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.2fr 1fr',
          gap: 22, marginBottom: 28,
        }}>

          <Card delay={0.4} accentBorder={D.emeraldBorder} accentColor={D.emerald}>
            <CardHead
              title="Revenue Trend (Last 7 Days)"
              sub={`Cumulative Week Revenue: RM ${stats.revChart.reduce((s, d) => s + d.revenue, 0).toFixed(2)}`}
              icon={TrendingUp}
              accent={D.emerald}
              gradient={D.gradEmerald}
            />
            <div style={{ padding: '22px 26px 18px' }}>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={stats.revChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={D.emerald} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={D.emerald} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={D.borderCard} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: D.inkDim, fontFamily: D.fontMono }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} domain={[0, 150]} ticks={[0, 50, 100, 150]} tick={{ fontSize: 11, fill: D.inkDim, fontFamily: D.fontMono }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue"
                    stroke={D.emerald} strokeWidth={2.5} fill="url(#emeraldGrad)"
                    dot={{ r: 4.5, fill: D.emerald, strokeWidth: 2.5, stroke: '#fff' }}
                    activeDot={{ r: 7, fill: D.emerald, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card delay={0.48} accentBorder={D.violetBorder} accentColor={D.violet}>
            <CardHead
              title="Daily Jobs Volume"
              sub="Orders per day"
              icon={BarChart2}
              accent={D.violet}
              gradient={D.gradViolet}
            />
            <div style={{ padding: '22px 26px 18px' }}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={stats.revChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={D.borderCard} vertical={false} />
                  <XAxis dataKey="label" interval={0} height={30} dy={10} tick={{ fontSize: 11, fill: D.inkDim, fontFamily: D.fontMono }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: D.inkDim, fontFamily: D.fontMono }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="jobs" name="Jobs" radius={[8, 8, 0, 0]} barSize={24}>
                    {stats.revChart.map((d, i) => (
                      <Cell key={i} fill={d.jobs > 0 ? D.violet : `${D.violet}45`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card delay={0.56} accentBorder={D.cyanBorder} accentColor={D.cyan}>
            <CardHead title="Status Breakdown" sub="All jobs allocation" icon={Activity} accent={D.cyan} gradient={D.gradCyan} />
            <div style={{ padding: '18px 22px 22px', position: 'relative' }}>
              {stats.statusChart.length > 0 ? (
                <>
                  <div style={{ position: 'relative', height: 155 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.statusChart} cx="50%" cy="50%"
                          innerRadius={46} outerRadius={66} paddingAngle={4} dataKey="value">
                          {stats.statusChart.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: D.ink, fontFamily: D.fontMono, lineHeight: 1 }}>{stats.total}</div>
                      <div style={{ fontSize: 9, color: D.inkFaint, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Total</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                    {stats.statusChart.map((d, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 10,
                        background: D.surfaceDown, border: `1px solid ${D.borderCard}`,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: D.inkMid, flex: 1, fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize' }}>{d.name}</span>
                        <span style={{
                          fontWeight: 800, fontFamily: D.fontMono, color: D.surface, fontSize: 13,
                          background: PIE_COLORS[i % PIE_COLORS.length], padding: '2px 8px', borderRadius: 6,
                        }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: D.inkDim, fontSize: 14 }}>No data yet</div>
              )}
            </div>
          </Card>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 22 }}>

          {/* Recent Jobs Table */}
          <Card delay={0.6} hover={false} accentBorder={D.blueBorder} accentColor={D.blue}>
            <CardHead
              title="Recent Activity"
              sub={`${jobs.slice(0, 15).length} latest jobs`}
              icon={Clock}
              accent={D.blue}
              gradient={D.gradCyan}
              action={
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => navigate('/admin/printing')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 700, color: D.violet,
                    background: D.violetDim, border: `1.5px solid ${D.violetBorder}`,
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: D.font,
                  }}
                >
                  View All <ChevronRight size={14} />
                </motion.button>
              }
            />
            <div style={{ maxHeight: 'none' }}>
              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 40px', color: D.inkDim }}>
                  <CheckCircle2 size={44} color={D.emerald} style={{ margin: '0 auto 16px' }} />
                  <div style={{ fontSize: 17, fontWeight: 700, color: D.ink, marginBottom: 6, fontFamily: D.fontDisplay }}>Queue is empty</div>
                  <div style={{ fontSize: 13 }}>Ready to receive new jobs</div>
                </div>
              ) : jobs.slice(0, 15).map((job, i) => (
                <motion.div
                  className="job-row"
                  key={job.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 26px', borderBottom: `1px solid ${D.borderCard}`,
                    cursor: 'pointer', transition: 'background 0.18s',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: job.status === 'completed' ? D.emeraldDim : D.cyanDim,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${job.status === 'completed' ? D.emeraldBorder : D.cyanBorder}`,
                  }}>
                    {job.status === 'completed'
                      ? <CheckCircle2 size={17} color={D.emerald} />
                      : <Clock size={17} color={D.cyan} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: D.ink, marginBottom: 4, fontFamily: D.fontMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.fileName || job.customerName || 'Walk-in Order'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: D.inkDim, fontWeight: 500 }}>{job.customerName || '—'}</span>
                      <StatusBadge status={job.status} />
                      {job.paymentStatus === 'unpaid' && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: D.amber, background: D.amberDim, padding: '3px 8px', borderRadius: 6, fontFamily: D.fontMono, border: `1px solid ${D.amberBorder}` }}>
                          UNPAID
                        </span>
                      )}
                      {job.deliveryOption === 'delivery' && <Truck size={13} color={D.blue} />}
                    </div>
                  </div>

                  {/* Price & time */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 900, color: D.emerald, letterSpacing: '-0.02em', fontFamily: D.fontMono }}>
                      RM {Number(job.totalPrice || job.price || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: D.inkFaint, marginTop: 4, fontFamily: D.fontMono }}>
                      {format(job.createdAt, 'HH:mm')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>



            {/* Top Services Leaderboard — ENHANCED with full names + % bars */}
            <Card delay={0.72} accentBorder={D.roseBorder} accentColor={D.rose}>
              <CardHead title="Top Services" sub="By order count" icon={Star} accent={D.rose} gradient={D.gradRose} />
              <div style={{ padding: '20px 22px 22px' }}>
                {stats.topServices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: D.inkDim, fontSize: 13 }}>
                    No service data yet
                  </div>
                ) : stats.topServices.map((s, i) => (
                  <ServiceRow
                    key={s.name}
                    name={s.name}
                    count={s.count}
                    max={stats.topServices[0].count}
                    rank={i + 1}
                    color={PIE_COLORS[i % PIE_COLORS.length]}
                    delay={0.85 + i * 0.07}
                  />
                ))}
              </div>
            </Card>

            {/* Notifications */}
            <Card delay={0.78} accentBorder={D.cyanBorder} accentColor={D.cyan}>
              <CardHead
                title="Notifications"
                sub={unreadCount > 0 ? `${unreadCount} unread` : `${notifications.length} total`}
                icon={Bell}
                accent={D.cyan}
                gradient={D.gradCyan}
                action={(
                  <button
                    onClick={markAllNotificationsRead}
                    style={{
                      fontSize: 12, fontWeight: 700, color: D.cyan,
                      border: `1px solid ${D.cyanBorder}`, background: D.cyanDim,
                      padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: D.font,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              />
              <div style={{ padding: '16px 18px 18px', maxHeight: 280, overflowY: 'auto' }}>
                {recentNotifications.length === 0 ? (
                  <div style={{ textAlign: 'center', color: D.inkDim, fontSize: 13, padding: '42px 0' }}>
                    No notifications yet
                  </div>
                ) : recentNotifications.map((note) => (
                  <div key={note.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '13px 0', borderBottom: `1px solid ${D.borderCard}`,
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                      background: note.read ? D.borderBr : D.rose,
                      boxShadow: note.read ? 'none' : `0 0 0 3px ${D.roseDim}`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: D.ink, fontFamily: D.font }}>
                          {note.type === 'new_order' ? 'New customer order' : 'Notification'}
                        </div>
                        <button
                          onClick={() => markNotificationRead(note.id)}
                          style={{
                            fontSize: 11, color: note.read ? D.inkFaint : D.cyan,
                            background: note.read ? 'transparent' : D.cyanDim,
                            border: note.read ? 'none' : `1px solid ${D.cyanBorder}`,
                            cursor: 'pointer', padding: note.read ? 0 : '2px 8px',
                            borderRadius: 6, fontFamily: D.font, fontWeight: 600, flexShrink: 0,
                          }}
                        >
                          {note.read ? 'Read' : 'Mark read'}
                        </button>
                      </div>
                      <div style={{ marginTop: 5, fontSize: 12.5, color: D.inkDim, lineHeight: 1.5 }}>
                        {note.customerName ? `${note.customerName} created order #${note.jobId?.slice(-6).toUpperCase()}` : note.message || 'New order received.'}
                      </div>
                      <div style={{ marginTop: 7, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 10.5, color: D.inkFaint, fontFamily: D.fontMono }}>
                        <span>{format(note.createdAt, 'MMM d, HH:mm')}</span>
                        {note.status && <span style={{ color: note.status === 'pending' ? D.amber : D.emerald, fontWeight: 700 }}>{note.status}</span>}
                        {note.paymentStatus && <span>{note.paymentStatus.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Customer Directory', sub: 'Manage profiles & history', icon: Users,  accent: D.emerald, gradient: D.gradEmerald, border: D.emeraldBorder, path: '/admin/customers' },
                { label: 'Catalogue Manager',  sub: 'Edit pricing & services',   icon: Grid,   accent: D.indigo,  gradient: D.gradIndigo,  border: D.blueBorder,   path: '/admin/catalogue' },
              ].map(({ label, sub, icon: Icon, accent, gradient, border, path }) => (
                <motion.button
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3, boxShadow: `0 20px 48px -12px ${accent}28, 0 0 0 2px ${border}` }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 13,
                    padding: '16px 20px', borderRadius: 16, background: D.surface,
                    border: `1.5px solid ${border}`,
                    cursor: 'pointer', fontFamily: D.font,
                    boxShadow: `0 4px 14px -4px ${accent}10`,
                    transition: 'all 0.25s', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 8px 18px ${accent}28`,
                  }}>
                    <Icon size={18} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: D.ink, marginBottom: 2, letterSpacing: '-0.01em' }}>{label}</div>
                    <div style={{ fontSize: 12, color: D.inkDim, fontWeight: 500 }}>{sub}</div>
                  </div>
                  <ArrowRight size={15} color={D.inkFaint} />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════ JOB DETAILS MODAL ══════════════════ */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(11,17,32,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24, backdropFilter: 'blur(4px)',
            }}
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: 'min(520px, 100%)', backgroundColor: '#fff',
                borderRadius: 24, border: `1.5px solid ${D.borderCard}`,
                boxShadow: '0 24px 64px rgba(11,17,32,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '20px 24px', borderBottom: `1.5px solid ${D.borderCard}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: D.surfaceUp }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: D.ink, fontFamily: D.fontDisplay }}>Job Details</div>
                  <div style={{ fontSize: 11, color: D.inkFaint, fontFamily: D.fontMono }}>ID: {selectedJob.id.toUpperCase()}</div>
                </div>
                <button 
                  onClick={() => setSelectedJob(null)} 
                  style={{ border: `1px solid ${D.borderCard}`, background: D.surfaceDown, color: D.inkMid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%' }}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>File Name</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: D.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} color={D.blue} />
                    {selectedJob.fileName || 'Walk-in Order'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Customer</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.inkMid }}>{selectedJob.customerName || 'Walk-in'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Service Type</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.inkMid }}>{selectedJob.serviceType || selectedJob.catalogueItem || 'Print'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Copies</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.inkMid }}>{selectedJob.pages || 1} {selectedJob.pages === 1 ? 'copy' : 'copies'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Color Mode</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.inkMid, textTransform: 'capitalize' }}>{selectedJob.color === 'Color' || selectedJob.color === 'color' ? 'Full Color' : 'Black & White'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Paper Size</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.inkMid }}>{selectedJob.paperSize || 'A4'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Binding</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.inkMid }}>{selectedJob.binding || 'None'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Price</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: D.emerald, fontFamily: D.fontMono }}>RM {Number(selectedJob.totalPrice || selectedJob.price || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status</div>
                    <div style={{ marginTop: 2 }}><StatusBadge status={selectedJob.status} /></div>
                  </div>
                </div>

                {selectedJob.notes && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: D.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
                    <div style={{ fontSize: 12.5, color: D.inkMid, background: D.surfaceDown, padding: '10px 14px', borderRadius: 10, border: `1px solid ${D.borderCard}` }}>{selectedJob.notes}</div>
                  </div>
                )}

                {selectedJob.filePreview && (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${D.borderCard}`, paddingTop: 16, display: 'flex', justifyContent: 'center' }}>
                    <a
                      href={selectedJob.filePreview}
                      download={selectedJob.fileName || 'document'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 13, fontWeight: 700, color: '#fff',
                        background: D.gradHero,
                        padding: '10px 20px', borderRadius: 12, textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(91,33,182,0.2)',
                      }}
                    >
                      <Download size={16} /> Download Document File
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════ NOTIFICATIONS DRAWER ══════════════════ */}
      <AnimatePresence>
        {notifOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(11,17,32,0.38)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
              padding: 24,
            }}
            onClick={() => setNotifOpen(false)}
          >
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              style={{
                width: 'min(420px, 100%)', maxHeight: 'calc(100vh - 48px)', background: '#fff',
                borderRadius: 22, border: `1.5px solid ${D.borderCard}`,
                boxShadow: '0 48px 120px rgba(11,17,32,0.22)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '22px 20px 16px', borderBottom: `1.5px solid ${D.borderCard}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: D.surfaceUp }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: D.ink, marginBottom: 3, fontFamily: D.fontDisplay }}>Notifications</div>
                  <div style={{ fontSize: 12, color: D.inkDim }}>{unreadCount > 0 ? `${unreadCount} unread` : `${notifications.length} total`}</div>
                </div>
                <button onClick={() => setNotifOpen(false)} style={{ border: `1px solid ${D.borderCard}`, background: D.surfaceDown, color: D.inkMid, cursor: 'pointer', fontWeight: 700, padding: '6px 14px', borderRadius: 9, fontSize: 13, fontFamily: D.font }}>Close</button>
              </div>
              <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 0', color: D.inkDim }}>No notifications available yet.</div>
                ) : notifications.map((note) => (
                  <div key={note.id} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${D.borderCard}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: D.ink, fontFamily: D.font }}>{note.type === 'new_order' ? 'New order received' : 'Admin update'}</div>
                        <div style={{ fontSize: 12.5, color: D.inkDim, marginTop: 5, lineHeight: 1.5 }}>{note.customerName ? `${note.customerName} created order #${note.jobId?.slice(-6).toUpperCase()}` : note.message || 'A new order notification has arrived.'}</div>
                      </div>
                      <button onClick={() => markNotificationRead(note.id)} style={{
                        border: note.read ? 'none' : `1px solid ${D.cyanBorder}`,
                        background: note.read ? 'transparent' : D.cyanDim,
                        color: note.read ? D.inkFaint : D.cyan, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        padding: note.read ? 0 : '3px 10px', borderRadius: 7, fontFamily: D.font, flexShrink: 0,
                      }}>
                        {note.read ? 'Read' : 'Mark read'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 9, fontSize: 10.5, color: D.inkFaint, fontFamily: D.fontMono }}>
                      <span>{format(note.createdAt, 'MMM d, HH:mm')}</span>
                      {note.status && <span style={{ color: note.status === 'pending' ? D.amber : D.emerald, fontWeight: 700 }}>{note.status}</span>}
                      {note.paymentStatus && <span>{note.paymentStatus.toUpperCase()}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 20px', borderTop: `1.5px solid ${D.borderCard}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: D.surfaceUp }}>
                <span style={{ fontSize: 12, color: D.inkDim }}>Latest updates</span>
                <button onClick={markAllNotificationsRead} style={{
                  border: 'none', background: D.gradCyan, color: '#fff',
                  borderRadius: 10, padding: '9px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: D.font,
                  boxShadow: `0 6px 16px ${D.cyan}35`,
                }}>
                  Mark all read
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}