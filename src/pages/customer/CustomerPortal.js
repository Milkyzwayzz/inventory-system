// src/pages/CustomerPortal.jsx
// Enhanced design — dark navy sidebar, cool page bg, Plus Jakarta Sans + IBM Plex Mono

import React, {
  useState, useEffect, createContext, useContext, useCallback, useRef
} from 'react';
import {
  Mail, Lock, User, Printer, ArrowRight, Loader2, LogOut,
  Bell, Upload, Eye, EyeOff, CheckCircle2,
  FileText, X, CreditCard, Clock, ShoppingCart, File,
  Trash2, AlertCircle, ChevronRight, Package,
  RefreshCw, CheckCircle, Zap, Shield,
  Search, Plus, Sparkles, Star,
  Edit2, Save, Phone, MapPin as MapPinIcon,
  AlertTriangle, ChevronDown, LayoutDashboard, History,
} from 'lucide-react';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, collection, query, where,
  onSnapshot, updateDoc, Timestamp, serverTimestamp, addDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { toast, Toaster } from 'react-hot-toast';
import {
  useNavigate, Routes, Route, Navigate, useLocation
} from 'react-router-dom';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import CataloguePage from './CatalogueCustomer';
import PrintOrderPage from './PrintOrderPage';
import { generateInvoice } from '../../utils/generateInvoice';

/* ── FONT + GLOBAL CSS ────────────────────────────────────────── */
const PORTAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

  .portal-root, .portal-root * { box-sizing: border-box; }
  .portal-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

  .portal-sidebar-scroll::-webkit-scrollbar { width: 3px; }
  .portal-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .portal-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }

  .portal-content-scroll::-webkit-scrollbar { width: 5px; }
  .portal-content-scroll::-webkit-scrollbar-track { background: transparent; }
  .portal-content-scroll::-webkit-scrollbar-thumb { background: #C4C9D8; border-radius: 10px; }

  @keyframes portal-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }
  @keyframes portal-pulse-ring {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes portal-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes portal-fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .portal-order-card:hover { transform: translateY(-3px); }
  .portal-order-card { transition: transform 0.22s ease, box-shadow 0.22s ease; }
`;

/* ── DESIGN TOKENS ────────────────────────────────────────────── */
const C = {
  // Sidebar — dark slate (matching admin portal)
  sidebarBg: '#0f172a',
  sidebarSurf: 'rgba(255,255,255,0.07)',
  sidebarHover: 'rgba(255,255,255,0.12)',
  sidebarBorder: 'rgba(255,255,255,0.08)',
  sidebarText: 'rgba(255,255,255,0.9)',
  sidebarDim: 'rgba(255,255,255,0.42)',

  // Page background — cool off-white blue
  pageBg: '#EEF2FA',
  cardBg: '#FFFFFF',
  cardBorder: '#DDE4F0',
  surfaceDown: '#F4F7FD',

  // Text
  ink: '#0B1120',
  inkMid: '#374163',
  inkDim: '#5A6480',
  inkFaint: '#8E98B4',

  // Brand accent — violet
  violet: '#6D28D9',
  violetDim: '#6D28D912',
  violetBorder: '#6D28D930',
  violetGrad: 'linear-gradient(135deg, #5B21B6, #7C3AED)',

  // Status
  emerald: '#047857',
  emeraldDim: '#04785712',
  emeraldBorder: '#04785730',
  amber: '#B45309',
  amberDim: '#B4530912',
  amberBorder: '#B4530930',
  blue: '#1D4ED8',
  blueDim: '#1D4ED812',
  blueBorder: '#1D4ED830',
  rose: '#BE123C',
  roseDim: '#BE123C12',
  roseBorder: '#BE123C30',
  slate: '#475569',
  slateDim: '#47556912',

  // Gradients
  heroGrad: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #1E3A5F 100%)',

  font: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

/* ── STATUS CONFIG ────────────────────────────────────────────── */
const STATUS = {
  pending: { bg: C.amberDim, border: C.amberBorder, text: C.amber, dot: C.amber, label: 'Pending' },
  processing: { bg: C.blueDim, border: C.blueBorder, text: C.blue, dot: C.blue, label: 'Processing' },
  ready: { bg: C.violetDim, border: C.violetBorder, text: C.violet, dot: C.violet, label: 'Ready' },
  completed: { bg: C.slateDim, border: '#47556930', text: C.slate, dot: C.slate, label: 'Completed' },
  cancelled: { bg: C.roseDim, border: C.roseBorder, text: C.rose, dot: C.rose, label: 'Cancelled' },
  paid: { bg: C.emeraldDim, border: C.emeraldBorder, text: C.emerald, dot: C.emerald, label: 'Paid ✓' },
  unpaid: { bg: C.roseDim, border: C.roseBorder, text: C.rose, dot: C.rose, label: 'Unpaid' },
  file_error: { bg: C.roseDim, border: C.roseBorder, text: C.rose, dot: C.rose, label: 'Action Required' },
  on_hold: { bg: C.amberDim, border: C.amberBorder, text: C.amber, dot: C.amber, label: 'On Hold' },
};

/* ── CONTEXT ──────────────────────────────────────────────────── */
const CustomerContext = createContext(null);
export const useCustomer = () => {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used inside CustomerProvider');
  return ctx;
};

/* ── STATUS BADGE ─────────────────────────────────────────────── */
const StatusBadge = ({ status, size = 'sm' }) => {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.text,
      border: `1px solid ${cfg.border}`,
      padding: size === 'xs' ? '2px 8px' : '4px 10px',
      fontSize: size === 'xs' ? 10 : 11,
      fontWeight: 800, borderRadius: 8, fontFamily: C.mono,
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

/* ── INPUT FIELD ──────────────────────────────────────────────── */
const InputField = ({ label, icon: Icon, error, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === 'password';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: C.inkDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.inkFaint, pointerEvents: 'none' }} />}
        <input
          style={{
            width: '100%', padding: '12px 14px', paddingLeft: Icon ? 42 : 14,
            paddingRight: isPassword ? 42 : 14,
            border: `1.5px solid ${error ? C.rose : C.cardBorder}`,
            borderRadius: 12, fontSize: 14, fontFamily: C.font, color: C.ink,
            background: C.surfaceDown, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
            fontWeight: 600,
          }}
          onFocus={e => { e.target.style.borderColor = C.violet; e.target.style.boxShadow = `0 0 0 3px ${C.violetDim}`; e.target.style.background = '#fff'; }}
          onBlur={e => { e.target.style.borderColor = error ? C.rose : C.cardBorder; e.target.style.boxShadow = 'none'; e.target.style.background = C.surfaceDown; }}
          {...props}
          type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.inkFaint, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0
            }}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 12, fontWeight: 600, color: C.rose, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

/* ── SIDEBAR NAV LINK ─────────────────────────────────────────── */
const SidebarNavLink = ({ icon: Icon, label, active, onClick, badge, collapsed }) => (
  <motion.button
    whileHover={{ x: collapsed ? 0 : 4 }} whileTap={{ scale: 0.97 }}
    onClick={onClick}
    title={collapsed ? label : undefined}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 14,
      padding: collapsed ? '12px' : '14px 18px', borderRadius: 18, marginBottom: 10,
      background: active ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : C.sidebarSurf,
      cursor: 'pointer', textAlign: 'left',
      boxShadow: active ? '0 14px 40px rgba(29,78,216,0.28)' : 'none',
      border: `1px solid ${active ? 'rgba(147,197,253,0.45)' : C.sidebarBorder}`,
      transition: 'all 0.25s ease',
      fontFamily: C.font,
      position: 'relative',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.sidebarHover; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = C.sidebarSurf; }}
  >
    <div style={{
      width: 42, height: 42, borderRadius: 14, flexShrink: 0,
      background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      <Icon size={18} color="#fff" strokeWidth={active ? 2.8 : 2.2} />
    </div>
    {!collapsed && (
      <span style={{ fontSize: 14, fontWeight: active ? 800 : 700, color: active ? '#fff' : C.sidebarText, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
    )}
    {!collapsed && badge > 0 && (
      <span style={{
        minWidth: 20, height: 20, borderRadius: 999, background: active ? 'rgba(255,255,255,0.22)' : '#BE123C',
        color: active ? '#fff' : '#fff', fontSize: 10, fontWeight: 900, fontFamily: C.mono,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 7px',
        boxShadow: active ? '0 0 0 rgba(0,0,0,0)' : '0 2px 6px rgba(190,18,60,0.4)',
      }}>{badge}</span>
    )}
    {collapsed && badge > 0 && (
      <span style={{
        position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, borderRadius: '50%',
        background: '#BE123C', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex',
        alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}>{badge}</span>
    )}
  </motion.button>
);

/* ── NEW ORDER FLASH BANNER ───────────────────────────────────── */
const NewOrderBanner = ({ orderId, onDismiss }) => (
  <AnimatePresence>
    {orderId && (
      <motion.div
        initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }} transition={{ type: 'spring', damping: 22 }}
        style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 500, width: 'min(420px, calc(100vw - 32px))' }}
      >
        <div style={{
          borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          background: C.violetGrad, boxShadow: '0 24px 48px rgba(109,40,217,0.4)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: 3, duration: 0.6 }}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} color="#fff" />
          </motion.div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 900, color: '#fff', fontSize: 14, fontFamily: C.font }}>Order Confirmed!</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontFamily: C.mono }}>
              #{orderId.slice(-8).toUpperCase()} — queued for printing
            </p>
          </div>
          <button onClick={onDismiss} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="#fff" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ── NOTIFICATION CENTER ──────────────────────────────────────── */
const NotificationCenter = ({ notifications, isOpen, onClose, onMarkRead }) => {
  const notable = notifications.slice(0, 12);
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(11,17,32,0.4)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }} transition={{ type: 'spring', damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, right: 0, height: '100%', width: 'min(380px, 100vw)',
              background: C.cardBg, borderLeft: `1.5px solid ${C.cardBorder}`,
              display: 'flex', flexDirection: 'column',
              boxShadow: '-8px 0 40px rgba(11,17,32,0.12)', fontFamily: C.font,
            }}
          >
            {/* Header */}
            <div style={{ padding: '22px 22px 18px', borderBottom: `1.5px solid ${C.cardBorder}`, background: C.sidebarBg.split(',')[0].replace('linear-gradient(180deg, ', '').replace(' 0%', ''), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={16} color="#fff" />
                </div>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>Notifications</span>
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} color="#fff" />
              </button>
            </div>

            <div className="portal-content-scroll" style={{ flex: 1, overflowY: 'auto' }}>
              {notable.length === 0 ? (
                <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <Bell size={32} style={{ color: C.cardBorder, margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.inkDim }}>No notifications yet</p>
                </div>
              ) : notable.map((note, i) => (
                <motion.div key={note.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ padding: '16px 20px', borderBottom: `1px solid ${C.cardBorder}`, display: 'flex', gap: 12, background: note.read ? '#fff' : C.violetDim }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: note.read ? C.cardBorder : C.violet, marginTop: 5, flexShrink: 0,
                    boxShadow: note.read ? 'none' : `0 0 0 3px ${C.violetDim}`
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>
                      {note.message || `Order #${note.jobId?.slice(-6).toUpperCase()} updated`}
                    </p>
                    <p style={{ fontSize: 11, color: C.inkFaint, marginTop: 3, fontFamily: C.mono }}>
                      {note.createdAt ? formatDistanceToNow(note.createdAt, { addSuffix: true }) : 'Recently'}
                    </p>
                  </div>
                  <button onClick={() => onMarkRead(note.id)} style={{
                    fontSize: 11, fontWeight: 700, color: note.read ? C.inkFaint : C.violet,
                    background: note.read ? 'transparent' : C.violetDim, border: note.read ? 'none' : `1px solid ${C.violetBorder}`,
                    padding: note.read ? 0 : '3px 9px', borderRadius: 7, cursor: 'pointer', fontFamily: C.font, flexShrink: 0,
                  }}>
                    {note.read ? 'Read' : 'Mark read'}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── PROFILE MODAL ────────────────────────────────────────────── */
const ProfileModal = ({ user, onClose }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.profile?.name || user?.displayName || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    address: user?.profile?.address || '',
    city: user?.profile?.city || '',
    postcode: user?.profile?.postcode || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const updateData = {
        name: form.name.trim(),
        phone: form.phone?.trim() || '',
        address: form.address?.trim() || '',
        city: form.city?.trim() || '',
        postcode: form.postcode?.trim() || '',
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'customers', user.uid), updateData, { merge: true });
      if (user.displayName !== form.name) {
        await updateProfile(auth.currentUser, { displayName: form.name });
      }
      toast.success('Profile saved!');
      setEditing(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error('Failed to save');
    }
    finally { setSaving(false); }
  };

  const parts = form.name.trim().split(' ').filter(Boolean);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : form.name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(11,17,32,0.4)', backdropFilter: 'blur(10px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ background: C.cardBg, borderRadius: 24, width: 'min(460px, 100%)', overflow: 'hidden', boxShadow: '0 48px 100px rgba(11,17,32,0.22)', border: `1.5px solid ${C.cardBorder}`, fontFamily: C.font }}
      >
        {/* Header */}
        <div style={{ background: C.heroGrad, padding: '28px 26px 24px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="#fff" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: C.mono, flexShrink: 0, backdropFilter: 'blur(4px)' }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{form.name || 'Your Name'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontFamily: C.mono }}>{form.email}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '22px 24px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editing ? (
            <>
              <InputField label="Full Name" icon={User} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <InputField label="Phone" icon={Phone} placeholder="+601234567890" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <InputField label="Street Address" placeholder="123 Main Street" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InputField label="City" placeholder="Johor Bahru" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                <InputField label="Postcode" placeholder="80000" value={form.postcode} onChange={e => setForm({ ...form, postcode: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px solid ${C.cardBorder}`, background: C.surfaceDown, color: C.inkMid, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: C.font }}>
                  Cancel
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: C.violetGrad, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: C.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 20px rgba(109,40,217,0.3)' }}>
                  {saving ? <Loader2 size={15} style={{ animation: 'portal-spin 1s linear infinite' }} /> : <Save size={15} />} Save Changes
                </motion.button>
              </div>
            </>
          ) : (
            <>
              {[
                form.phone && { icon: Phone, value: form.phone },
                (form.address || form.city) && { icon: MapPinIcon, value: [form.address, form.city, form.postcode].filter(Boolean).join(', ') },
              ].filter(Boolean).map(({ icon: Icon, value }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: C.surfaceDown, borderRadius: 12, border: `1px solid ${C.cardBorder}` }}>
                  <Icon size={15} style={{ color: C.violet, marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{value}</span>
                </div>
              ))}
              {!form.phone && !form.address && (
                <div style={{ padding: '20px', textAlign: 'center', color: C.inkFaint, fontSize: 13 }}>
                  No contact details added yet.
                </div>
              )}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setEditing(true)}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1.5px solid ${C.cardBorder}`, background: C.surfaceDown, color: C.inkMid, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: C.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Edit2 size={14} /> Edit Profile
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── STAT CARD ────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, accent = C.violet, accentDim, accentBorder, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4 }}
    style={{
      background: C.cardBg, borderRadius: 18, padding: '20px 20px 18px',
      border: `1.5px solid ${accentBorder || C.cardBorder}`,
      boxShadow: `0 4px 18px -4px ${accent}12, 0 1px 3px rgba(0,0,0,0.04)`,
      transition: 'all 0.22s ease', fontFamily: C.font,
    }}
  >
    <div style={{
      width: 42, height: 42, borderRadius: 13,
      background: accentDim || C.violetDim, border: `1px solid ${accentBorder || C.violetBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      boxShadow: `0 6px 16px ${accent}20`,
    }}>
      <Icon size={18} style={{ color: accent }} />
    </div>
    <p style={{ fontSize: 28, fontWeight: 900, color: C.ink, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: C.mono }}>{value}</p>
    <p style={{ fontSize: 11, fontWeight: 700, color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>{label}</p>
  </motion.div>
);

/* ── ORDER CARD ───────────────────────────────────────────────── */
const OrderCard = ({ order, onView, index = 0 }) => {
  const isReady = order.status === 'ready';
  const isNew = isReady && !order.readByCustomer;
  const daysAgo = order.createdAt ? differenceInDays(new Date(), order.createdAt) : null;

  const barColor =
    order.status === 'completed' ? C.slate :
      order.status === 'ready' ? C.violet :
        order.status === 'processing' ? C.blue :
          order.status === 'cancelled' ? C.rose : C.amber;

  return (
    <motion.div
      className="portal-order-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: C.cardBg, borderRadius: 18, overflow: 'hidden',
        border: `1.5px solid ${isNew ? C.violet : C.cardBorder}`,
        boxShadow: isNew ? `0 4px 20px ${C.violet}22` : '0 2px 12px rgba(11,17,32,0.05)',
        fontFamily: C.font, position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: barColor, width: '100%' }} />

      {/* Ready badge */}
      {isNew && (
        <motion.div
          animate={{ opacity: [0.8, 1, 0.8] }} transition={{ repeat: Infinity, duration: 1.6 }}
          style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: C.violetGrad, color: '#fff', fontSize: 10, fontWeight: 900, fontFamily: C.mono, boxShadow: `0 4px 12px ${C.violet}40` }}>
          <Zap size={10} /> Ready
        </motion.div>
      )}

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div style={{ paddingRight: isNew ? 80 : 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.ink, lineHeight: 1.3, marginBottom: 4, letterSpacing: '-0.01em' }}>
            {order.catalogueItem || order.fileName || 'Print Order'}
          </p>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.inkFaint, fontFamily: C.mono }}>
            #{order.id?.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Spec chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: `${order.pages || '—'} pg` },
            { label: `${order.copies || '—'} copy` },
            { label: order.color === 'color' ? 'Color' : 'B&W' },
            order.paperSize && { label: order.paperSize },
          ].filter(Boolean).map(({ label }, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.inkMid, background: C.surfaceDown, border: `1px solid ${C.cardBorder}`, padding: '4px 10px', borderRadius: 8, fontFamily: C.mono }}>
              {label}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: `1px solid ${C.cardBorder}` }}>
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.violet, letterSpacing: '-0.04em', fontFamily: C.mono, lineHeight: 1 }}>
              RM {Number(order.price || 0).toFixed(2)}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              <StatusBadge status={order.status} size="xs" />
              <StatusBadge status={order.paymentStatus} size="xs" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {daysAgo !== null && (
              <span style={{ fontSize: 11, color: C.inkFaint, fontFamily: C.mono }}>
                {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onView(order)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: C.violetGrad, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: C.font, boxShadow: `0 4px 14px ${C.violet}30` }}>
              <Eye size={13} /> View
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── ORDER DETAIL MODAL ───────────────────────────────────────── */
const OrderDetailModal = ({ order, onClose }) => {
  const [reUploadFile, setReUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  if (!order) return null;

  const handleFileChange = (e) => {
    const raw = e.target.files[0];
    if (!raw) return;
    const allowed = ['pdf', 'jpeg', 'jpg', 'png', 'doc', 'docx'];
    const ext = raw.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) { toast.error('Unsupported format. Use PDF, DOC, DOCX, JPEG, or PNG.'); return; }
    if (raw.size > 100 * 1024 * 1024) { toast.error('File exceeds 100MB limit.'); return; }
    setReUploadFile(raw);
    toast.success(`${raw.name} ready for upload`);
  };

  const handleReUploadSubmit = async () => {
    if (!reUploadFile) return;
    setUploading(true);
    const toastId = toast.loading('Uploading replacement file…');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(reUploadFile);
      reader.onload = async () => {
        const filePreview = reUploadFile.size < 800000 ? reader.result : null;
        await updateDoc(doc(db, 'printJobs', order.id), { fileName: reUploadFile.name, fileType: reUploadFile.type || 'application/octet-stream', filePreview, status: 'pending', updatedAt: serverTimestamp() });
        await addDoc(collection(db, 'adminNotifications'), { type: 'file_replaced', jobId: order.id, customerId: order.customerId || '', customerName: order.customerName || 'Customer', fileName: reUploadFile.name, read: false, createdAt: serverTimestamp() });
        toast.success('Replacement file submitted!', { id: toastId });
        setReUploadFile(null); onClose();
        setUploading(false);
      };
      reader.onerror = () => { toast.error('Failed to read file', { id: toastId }); setUploading(false); };
    } catch (err) { toast.error(err.message, { id: toastId }); setUploading(false); }
  };

  const stepIndex = { pending: 1, paid: 2, processing: 3, ready: 4, completed: 5 };
  const currentStep = order.status === 'completed' ? 5 : order.status === 'ready' ? 4 : order.status === 'processing' ? 3 : order.paymentStatus === 'paid' ? 2 : 1;
  const steps = [
    { label: 'Placed', emoji: '🛒' },
    { label: 'Paid', emoji: '💳' },
    { label: 'Printing', emoji: '🖨️' },
    { label: 'Ready', emoji: '📦' },
    { label: 'Done', emoji: '✅' },
  ];

  const rows = [
    ['File', order.fileName], ['Service', order.catalogueItem], ['Pages', order.pages],
    ['Copies', order.copies], ['Color', order.color === 'color' ? 'Full Color' : 'B&W'],
    ['Paper', order.paperSize], ['Binding', order.binding], ['Notes', order.notes || '—'],
    ['Payment', order.paymentMethod || '—'],
  ].filter(([, v]) => v);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(11,17,32,0.4)', backdropFilter: 'blur(10px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ background: C.cardBg, borderRadius: 24, width: 'min(460px, 100%)', overflow: 'hidden', boxShadow: '0 48px 100px rgba(11,17,32,0.22)', border: `1.5px solid ${C.cardBorder}`, fontFamily: C.font }}
      >
        {/* Header */}
        <div style={{ background: C.heroGrad, padding: '22px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: C.mono }}>#{order.id?.slice(-8).toUpperCase()}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>{order.catalogueItem}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={15} color="#fff" />
          </button>
        </div>

        <div className="portal-content-scroll" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '22px 22px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Stepper */}
          <div style={{ background: C.surfaceDown, borderRadius: 16, padding: '18px 14px 14px', border: `1px solid ${C.cardBorder}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: C.inkFaint, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 14, fontFamily: C.mono }}>
              Order Progress
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
              {/* Progress track */}
              <div style={{ position: 'absolute', top: 16, left: '10%', right: '10%', height: 3, background: C.cardBorder, borderRadius: 4 }}>
                <div style={{ height: '100%', borderRadius: 4, background: C.violetGrad, width: `${((currentStep - 1) / 4) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
              {steps.map((step, idx) => {
                const active = idx + 1 <= currentStep;
                const isCurrent = idx + 1 === currentStep;
                return (
                  <div key={step.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', fontSize: 14,
                      background: active ? C.violetGrad : C.cardBg,
                      border: `2px solid ${active ? C.violet : C.cardBorder}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isCurrent ? `0 0 0 4px ${C.violetDim}` : 'none',
                      transform: isCurrent ? 'scale(1.12)' : 'scale(1)',
                      transition: 'all 0.3s ease',
                    }}>
                      <span style={{ fontSize: active ? 14 : 12 }}>{step.emoji}</span>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: active ? 800 : 600, color: active ? C.violet : C.inkFaint, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', fontFamily: C.mono }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
          </div>

          {/* File error section */}
          {order.status === 'file_error' && (
            <div style={{ background: C.roseDim, border: `1.5px solid ${C.roseBorder}`, borderRadius: 14, padding: '16px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <AlertTriangle size={16} style={{ color: C.rose, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontWeight: 800, fontSize: 13, color: C.rose }}>Action Required: File Error</p>
                  <p style={{ fontSize: 12, color: C.rose, opacity: 0.8, marginTop: 3, lineHeight: 1.5 }}>
                    The file was flagged as corrupted or unreadable. Please upload a replacement.
                  </p>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.jpeg,.jpg,.png,.doc,.docx" style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 14px', background: '#fff', border: `1px solid ${C.roseBorder}`, borderRadius: 10, fontSize: 12, fontWeight: 700, color: C.rose, cursor: 'pointer', fontFamily: C.font, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={13} /> {reUploadFile ? 'Change File' : 'Select File'}
                </button>
                {reUploadFile && <span style={{ fontSize: 12, color: C.inkDim, fontFamily: C.mono, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reUploadFile.name}</span>}
              </div>
              {reUploadFile && (
                <button type="button" onClick={handleReUploadSubmit} disabled={uploading}
                  style={{ marginTop: 10, width: '100%', padding: '10px', background: C.rose, border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: C.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {uploading ? <Loader2 size={14} style={{ animation: 'portal-spin 1s linear infinite' }} /> : null}
                  Submit Replacement File
                </button>
              )}
            </div>
          )}

          {/* Details table */}
          <div style={{ background: C.surfaceDown, borderRadius: 14, border: `1px solid ${C.cardBorder}`, overflow: 'hidden' }}>
            {rows.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'flex-start', padding: '11px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${C.cardBorder}` : 'none', background: i % 2 === 0 ? '#fff' : C.surfaceDown }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.inkDim, width: 90, flexShrink: 0, fontFamily: C.mono }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, flex: 1 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: C.violetDim, borderRadius: 14, border: `1.5px solid ${C.violetBorder}` }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.inkMid, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
            <span style={{ fontSize: 26, fontWeight: 900, color: C.violet, fontFamily: C.mono, letterSpacing: '-0.04em' }}>RM {Number(order.price || 0).toFixed(2)}</span>
          </div>

          {order.paymentStatus === 'paid' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => generateInvoice(order)}
              style={{ width: '100%', padding: '13px', background: C.ink, border: 'none', borderRadius: 13, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', fontFamily: C.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <FileText size={15} /> Download Invoice
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── FILTER BAR ───────────────────────────────────────────────── */
const FILTER_TABS = [
  { id: 'all', label: 'All', Icon: FileText },
  { id: 'pending', label: 'Pending', Icon: Clock },
  { id: 'processing', label: 'Printing', Icon: RefreshCw },
  { id: 'ready', label: 'Ready', Icon: CheckCircle },
  { id: 'completed', label: 'Done', Icon: CheckCircle2 },
];

const FilterBar = ({ active, onChange, counts }) => (
  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, fontFamily: C.font }}>
    {FILTER_TABS.map(({ id, label, Icon }) => {
      const isActive = active === id;
      return (
        <motion.button key={id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => onChange(id)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 12, fontSize: 12, fontWeight: isActive ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', fontFamily: C.font, border: `1.5px solid ${isActive ? C.violet : C.cardBorder}`, background: isActive ? C.violetDim : C.cardBg, color: isActive ? C.violet : C.inkDim, boxShadow: isActive ? `0 4px 12px ${C.violet}18` : 'none', transition: 'all 0.18s ease' }}>
          <Icon size={13} />
          {label}
          {counts[id] > 0 && (
            <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: isActive ? C.violet : C.surfaceDown, color: isActive ? '#fff' : C.inkMid, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', fontFamily: C.mono }}>
              {counts[id]}
            </span>
          )}
        </motion.button>
      );
    })}
  </div>
);

/* ── CUSTOMER PROVIDER ────────────────────────────────────────── */
const CustomerProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubAuth = null, unsubOrders = null, unsubNotifications = null, unsubProfile = null;
    unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let profile = {};
        try {
          const snap = await getDoc(doc(db, 'customers', fbUser.uid));
          if (snap.exists()) {
            profile = snap.data();
          } else {
            profile = {
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Customer',
              email: fbUser.email || '',
              totalOrders: 0,
              totalSpent: 0,
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'customers', fbUser.uid), profile);
          }
        } catch (e) {
          console.error("Error setting up customer profile:", e);
        }
        setUser({ uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName, profile });
        if (unsubProfile) unsubProfile();
        unsubProfile = onSnapshot(doc(db, 'customers', fbUser.uid), (snap) => {
          if (snap.exists()) {
            setUser(prev => prev ? { ...prev, profile: snap.data() } : null);
          }
        }, (err) => {
          console.error("Firestore customer profile snapshot error:", err);
        });
        if (unsubOrders) unsubOrders();
        if (unsubNotifications) unsubNotifications();
        unsubOrders = onSnapshot(
          query(collection(db, 'printJobs'), where('customerId', '==', fbUser.uid)),
          snap => {
            const mapped = snap.docs.map(d => { const data = d.data(); return { id: d.id, ...data, status: data.status || 'pending', paymentStatus: data.paymentStatus || 'unpaid', readByCustomer: data.readByCustomer || false, createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt, updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt }; });
            mapped.sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0));
            setOrders(mapped);
          }, () => setOrders([])
        );
        unsubNotifications = onSnapshot(
          query(collection(db, 'notifications'), where('userId', '==', fbUser.uid)),
          snap => {
            const mapped = snap.docs.map(d => { const data = d.data(); return { id: d.id, ...data, read: data.read ?? false, createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt }; });
            mapped.sort((a, b) => (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) - (a.createdAt instanceof Date ? a.createdAt.getTime() : 0));
            setNotifications(mapped);
          }, () => setNotifications([])
        );
        setLoading(false);
      } else {
        setUser(null); setOrders([]); setNotifications([]); setLoading(false);
        navigate('/customer/login');
      }
    });
    return () => { unsubNotifications?.(); unsubOrders?.(); unsubProfile?.(); unsubAuth?.(); };
  }, [navigate]);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    toast.success('Welcome back!');
    navigate('/customer/dashboard');
  };
  const register = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'customers', cred.user.uid), { name: name.trim(), email: email.toLowerCase(), totalOrders: 0, totalSpent: 0, createdAt: Timestamp.now() });
    toast.success('Account created!');
    navigate('/customer/dashboard');
  };
  const logout = async () => { await signOut(auth); toast.success('Signed out'); };

  return (
    <CustomerContext.Provider value={{ user, orders, notifications, loading, login, register, logout }}>
      {children}
    </CustomerContext.Provider>
  );
};

/* ── CUSTOMER SHELL (Layout Wrapper) ──────────────────────────── */
const CustomerShell = ({ children }) => {
  const { user, orders, notifications, logout } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [flashOrderId, setFlashOrderId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (location.state?.flash && location.state?.newOrderId) {
      setFlashOrderId(location.state.newOrderId);
      navigate(location.pathname, { replace: true, state: null });
      const t = setTimeout(() => setFlashOrderId(null), 6000);
      return () => clearTimeout(t);
    }
  }, [location.state, navigate]);

  const markNotificationRead = async (id) => {
    try { await updateDoc(doc(db, 'notifications', id), { read: true }); }
    catch { toast.error('Could not mark notification read'); }
  };

  const stats = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    paid: orders.filter(o => o.paymentStatus === 'paid').length,
    totalSpent: orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + Number(o.price || 0), 0),
    unread: notifications.filter(n => !n.read).length,
  };

  const displayName = user?.profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Customer';
  const parts = displayName.trim().split(' ').filter(Boolean);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : displayName.slice(0, 2).toUpperCase();

  const activeSection = location.pathname.endsWith('/customer/dashboard') ? 'orders' : location.pathname.includes('/customer/dashboard/catalogue') ? 'catalogue' : '';

  return (
    <div className="portal-root" style={{ display: 'flex', minHeight: '100vh', fontFamily: C.font }}>
      <style>{PORTAL_CSS}</style>

      <NewOrderBanner orderId={flashOrderId} onDismiss={() => setFlashOrderId(null)} />

      {/* ── SIDEBAR ── */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: collapsed ? 80 : 260, zIndex: 100,
        background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBorder}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 32px rgba(0,0,0,0.22)',
        fontFamily: C.font,
        transition: 'width 0.25s ease-in-out',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${C.sidebarBorder}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 12 }}>
            
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: C.blue,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 20px ${C.blue}40`,
                border: '1px solid rgba(255,255,255,0.2)',
                flexShrink: 0
              }}
            >
              <Printer size={18} color="#fff" strokeWidth={2.5} />
            </div>

            {!collapsed && (
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    background: 'linear-gradient(135deg, #fff, #93C5FD)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    wordBreak: 'break-word',
                  }}
                >
                  Krishsan Tech Enterprise
                </div>

                <div
                  style={{
                    fontSize: 9,
                    color: C.sidebarDim,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    marginTop: 2,
                    textTransform: 'uppercase',
                    fontFamily: C.mono
                  }}
                >
                  Customer Portal
                </div>
              </div>
            )}
          </div>
          {/* Collapse/Expand button */}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              marginTop: 10, width: '100%', padding: '6px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff',
              fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: C.font,
              transition: 'background 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            {collapsed ? '→' : '← Collapse'}
          </button>
        </div>

        {/* Nav */}
        <nav className="portal-sidebar-scroll" style={{ flex: 1, padding: '16px 14px', overflowY: 'auto' }}>
          {!collapsed && (
            <div style={{ fontSize: 9, fontWeight: 800, color: C.sidebarDim, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4, fontFamily: C.mono }}>
              Navigation
            </div>
          )}
          <SidebarNavLink icon={LayoutDashboard} label="My Orders" active={activeSection === 'orders'} onClick={() => navigate('/customer/dashboard')} badge={stats.ready} collapsed={collapsed} />
          <SidebarNavLink icon={ShoppingCart} label="Printing Catalogue" active={activeSection === 'catalogue'} onClick={() => navigate('/customer/dashboard/catalogue')} collapsed={collapsed} />
          <SidebarNavLink icon={Bell} label="Notifications" active={notifOpen} onClick={() => setNotifOpen(true)} badge={stats.unread} collapsed={collapsed} />
        </nav>

        {/* Footer / Profile */}
        <div style={{ padding: '14px 14px 18px', borderTop: `1px solid ${C.sidebarBorder}` }}>
          {collapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setProfileOpen(true)}
                style={{
                  width: 42, height: 42, borderRadius: 16, background: C.violetGrad,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 900, color: '#fff', fontFamily: C.mono,
                  border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
                  boxShadow: `0 10px 22px ${C.violet}25`, margin: '0 auto'
                }}
                title={displayName}
              >
                {initials}
              </button>
              <button
                onClick={logout}
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: 'rgba(190,18,60,0.2)', border: '1px solid rgba(190,18,60,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#FCA5A5', margin: '0 auto'
                }}
                title="Sign Out"
              >
                <LogOut size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setProfileOpen(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, background: C.sidebarSurf, border: `1px solid ${C.sidebarBorder}`, cursor: 'pointer', textAlign: 'left', marginBottom: 14, fontFamily: C.font, transition: 'all 180ms ease' }}
                onMouseEnter={e => e.currentTarget.style.background = C.sidebarHover}
                onMouseLeave={e => e.currentTarget.style.background = C.sidebarSurf}
              >
                <div style={{ width: 42, height: 42, borderRadius: 16, background: C.violetGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', fontFamily: C.mono, border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0, boxShadow: `0 10px 22px ${C.violet}25` }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.sidebarText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: C.sidebarDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, fontFamily: C.mono }}>{user?.email}</div>
                </div>
                <Edit2 size={14} style={{ color: C.sidebarDim, flexShrink: 0 }} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={logout}
                style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'rgba(190,18,60,0.2)', color: '#FCA5A5', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: C.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em', textTransform: 'uppercase', border: '1px solid rgba(190,18,60,0.25)', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(190,18,60,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(190,18,60,0.2)'}
              >
                <LogOut size={13} strokeWidth={2.5} /> Sign Out
              </motion.button>
            </>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="portal-content-scroll" style={{ flex: 1, marginLeft: collapsed ? 80 : 260, overflowY: 'auto', minHeight: '100vh', background: C.pageBg, transition: 'margin-left 0.25s ease-in-out' }}>
        {children}
      </main>

      <NotificationCenter notifications={notifications} isOpen={notifOpen} onClose={() => setNotifOpen(false)} onMarkRead={markNotificationRead} />

      <AnimatePresence>
        {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

/* ── CUSTOMER DASHBOARD ───────────────────────────────────────── */
const CustomerDashboard = () => {
  const { user, orders, notifications } = useCustomer();
  const navigate = useNavigate();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const stats = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    paid: orders.filter(o => o.paymentStatus === 'paid').length,
    totalSpent: orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + Number(o.price || 0), 0),
    unread: notifications.filter(n => !n.read).length,
  };

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.fileName?.toLowerCase().includes(q) || o.catalogueItem?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q);
    }
    return true;
  });

  const displayName = user?.profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Customer';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px 80px' }}>
      {/* ── HERO BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: C.heroGrad, borderRadius: 24, padding: '32px 36px',
          marginBottom: 28, position: 'relative', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 60px rgba(13,31,60,0.3)',
        }}
      >
        {/* Orbs */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 180, width: 160, height: 160, borderRadius: '50%', background: 'rgba(14,116,144,0.2)', filter: 'blur(30px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkles size={13} style={{ color: '#C4B5FD' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: C.mono }}>
                Welcome back
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.15, margin: '0 0 10px', fontFamily: C.font }}>
              {displayName}
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {stats.all} orders · {stats.paid} paid ·&nbsp;
              <span style={{ color: '#C4B5FD', fontWeight: 700 }}>RM {Number(stats.totalSpent || 0).toFixed(0)} total</span>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/customer/dashboard/catalogue')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: C.font, border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', letterSpacing: '-0.01em' }}>
              <ShoppingCart size={17} /> Place New Order
            </motion.button>

            {stats.ready > 0 && (
              <motion.div
                animate={{ opacity: [0.85, 1, 0.85] }} transition={{ repeat: Infinity, duration: 2 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: 'rgba(4,120,87,0.25)', border: '1px solid rgba(4,120,87,0.35)', color: '#6EE7B7', fontSize: 12, fontWeight: 700 }}>
                <CheckCircle size={14} />
                {stats.ready} order{stats.ready > 1 ? 's' : ''} ready for pickup!
                <ChevronRight size={13} />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard index={0} label="Total Orders" value={stats.all} icon={FileText} accent={C.violet} accentDim={C.violetDim} accentBorder={C.violetBorder} />
        <StatCard index={1} label="Pending" value={stats.pending} icon={Clock} accent={C.amber} accentDim={C.amberDim} accentBorder={C.amberBorder} />
        <StatCard index={2} label="Completed" value={stats.completed} icon={CheckCircle2} accent={C.emerald} accentDim={C.emeraldDim} accentBorder={C.emeraldBorder} />
        <StatCard index={3} label="Total Spent" value={`RM ${Number(stats.totalSpent || 0).toFixed(0)}`} icon={CreditCard} accent={C.blue} accentDim={C.blueDim} accentBorder={C.blueBorder} />
      </div>

      {/* ── ORDERS SECTION ── */}
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: C.ink, letterSpacing: '-0.03em', margin: 0 }}>Your Orders</h2>
            <p style={{ fontSize: 12, color: C.inkDim, marginTop: 3, fontWeight: 500 }}>
              {filtered.length} order{filtered.length !== 1 ? 's' : ''} · Live updates
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: C.inkFaint }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search orders…"
              style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: `1.5px solid ${C.cardBorder}`, background: C.cardBg, color: C.ink, fontSize: 13, fontFamily: C.font, outline: 'none', fontWeight: 600 }}
              onFocus={e => { e.target.style.borderColor = C.violet; e.target.style.boxShadow = `0 0 0 3px ${C.violetDim}`; }}
              onBlur={e => { e.target.style.borderColor = C.cardBorder; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ marginBottom: 20 }}>
          <FilterBar active={filter} onChange={setFilter} counts={stats} />
        </div>

        {/* Order grid */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ background: C.cardBg, borderRadius: 20, border: `2px dashed ${C.cardBorder}`, padding: '60px 40px', textAlign: 'center', fontFamily: C.font }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: C.surfaceDown, border: `1.5px solid ${C.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Package size={24} style={{ color: C.inkFaint }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C.inkDim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {search ? 'No results found' : filter !== 'all' ? `No ${filter} orders` : 'No orders yet'}
            </h3>
            <p style={{ fontSize: 13, color: C.inkFaint, marginBottom: 22 }}>
              {search ? 'Try a different search term' : 'Your print orders will appear here once placed'}
            </p>
            {!search && filter === 'all' && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/customer/dashboard/catalogue')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 13, border: 'none', background: C.violetGrad, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: C.font, boxShadow: `0 8px 20px ${C.violet}30` }}>
                <ShoppingCart size={15} /> Place Your First Order
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((order, i) => (
                <OrderCard key={order.id} order={order} index={i} onView={setSelectedOrder} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </AnimatePresence>
    </div>
  );
};

/* ── AUTH PAGE ────────────────────────────────────────────────── */
const AuthPage = () => {
  const { login, register } = useCustomer();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    if (!isLogin && !form.name) { setError('Name is required'); return; }
    setLoading(true); setError('');
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      const msgs = { 'auth/user-not-found': 'No account found.', 'auth/wrong-password': 'Incorrect password.', 'auth/email-already-in-use': 'Email already registered.', 'auth/weak-password': 'Password must be 6+ characters.', 'auth/invalid-credential': 'Invalid email or password.', 'auth/invalid-email': 'Enter a valid email.' };
      setError(msgs[err.code] || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: C.font }}>
      <style>{PORTAL_CSS}</style>
      <div className="portal-root" style={{ width: '100%' }}>
        {/* Subtle grid bg */}
        <div style={{ position: 'fixed', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg,#0D0D0D 0,#0D0D0D 1px,transparent 1px,transparent 56px),repeating-linear-gradient(90deg,#0D0D0D 0,#0D0D0D 1px,transparent 1px,transparent 56px)', pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 1, width: 'min(420px, 100%)', margin: '0 auto' }}>
          <div style={{ background: C.cardBg, borderRadius: 24, border: `1.5px solid ${C.cardBorder}`, overflow: 'hidden', boxShadow: '0 32px 80px rgba(11,17,32,0.14)' }}>
            {/* Header */}
            <div style={{ background: C.heroGrad, padding: '36px 32px 28px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', filter: 'blur(30px)', pointerEvents: 'none' }} />
              <motion.div whileHover={{ rotate: 10, scale: 1.08 }}
                style={{ width: 58, height: 58, borderRadius: 18, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', backdropFilter: 'blur(4px)' }}>
                <Printer size={26} color="#fff" strokeWidth={2.3} />
              </motion.div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 4 }}>
                {isLogin ? 'Welcome back' : 'Create account'}
              </h1>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: C.mono }}>
                Customer Portal
              </p>
            </div>

            {/* Tab toggle */}
            <div style={{ display: 'flex', borderBottom: `1.5px solid ${C.cardBorder}`, background: C.surfaceDown }}>
              {[['Sign In', true], ['Create Account', false]].map(([label, val]) => (
                <button key={label} onClick={() => { setIsLogin(val); setError(''); }}
                  style={{ flex: 1, padding: '13px', fontSize: 13, fontWeight: isLogin === val ? 800 : 600, fontFamily: C.font, cursor: 'pointer', border: 'none', borderBottom: `3px solid ${isLogin === val ? C.violet : 'transparent'}`, background: isLogin === val ? C.cardBg : 'transparent', color: isLogin === val ? C.ink : C.inkDim, transition: 'all 0.18s ease' }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 11, background: C.roseDim, border: `1px solid ${C.roseBorder}` }}>
                    <AlertCircle size={14} style={{ color: C.rose, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.rose }}>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <InputField label="Full Name" icon={User} placeholder="Your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </motion.div>
                )}
              </AnimatePresence>

              <InputField label="Email" icon={Mail} type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <InputField label="Password" icon={Lock} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 13, border: 'none', background: C.violetGrad, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: C.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: `0 10px 28px ${C.violet}30`, marginTop: 4 }}>
                {loading ? <Loader2 size={18} style={{ animation: 'portal-spin 1s linear infinite' }} /> : <ArrowRight size={18} />}
                {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
              </motion.button>
            </div>

            <div style={{ padding: '14px 28px 22px', borderTop: `1px solid ${C.cardBorder}`, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.inkDim, fontWeight: 500 }}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  style={{ fontWeight: 800, color: C.violet, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: C.font }}>
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: C.inkFaint, fontFamily: C.font }}>
            <Shield size={12} style={{ color: C.violet }} /> SSL encrypted · Data secured
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ── CUSTOMER ROUTER ──────────────────────────────────────────── */
const CustomerRouter = () => {
  const { user, loading } = useCustomer();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate('/customer/login'); }, [user, loading, navigate]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font }}>
      <style>{PORTAL_CSS}</style>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: C.violetDim, border: `1.5px solid ${C.violetBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'portal-float 2s ease-in-out infinite' }}>
          <Printer size={22} style={{ color: C.violet }} />
        </div>
        <p style={{ fontSize: 12, fontWeight: 800, color: C.inkFaint, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: C.mono }}>Loading…</p>
      </motion.div>
    </div>
  );

  return (
    <CustomerShell>
      <Routes>
        <Route index element={<CustomerDashboard />} />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="print-order" element={<PrintOrderPage />} />
        <Route path="print-order/:catalogueItemId" element={<PrintOrderPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </CustomerShell>
  );
};

/* ── MAIN EXPORT ──────────────────────────────────────────────── */
const CustomerPortal = () => (
  <CustomerProvider>
    <Routes>
      <Route path="login" element={<AuthPage />} />
      <Route path="dashboard/*" element={<CustomerRouter />} />
      <Route path="catalogue/*" element={<Navigate to="/customer/dashboard/catalogue" replace />} />
      <Route path="print-order" element={<Navigate to="/customer/dashboard/print-order" replace />} />
      <Route path="print-order/:catalogueItemId" element={<Navigate to="/customer/dashboard/print-order/:catalogueItemId" replace />} />
      <Route index element={<Navigate to="dashboard" replace />} />
    </Routes>
  </CustomerProvider>
);

export default CustomerPortal;
