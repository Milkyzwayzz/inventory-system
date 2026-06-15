import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Plus, Trash2, Edit3, DollarSign, FileText, Save,
  RefreshCw, Search, Filter, ChevronDown, Image as ImageIcon,
  Palette, BookOpen, Layers, Upload, Eye, Zap, X, Maximize2,
  Download, Share2, MoreVertical, CheckCircle, AlertCircle, Grid, List
} from 'lucide-react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const T = {
  // Colors
  ink: '#0A0A0F',
  inkMid: '#3D3D4E',
  inkLight: '#7C7C96',
  inkFaint: '#BBBBD0',
  paper: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#EBEBF0',
  borderDark: '#D4D4DF',

  // Accents
  accent: '#4F46E5',       
  accentSoft: '#EEF2FF',
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  premium: '#B45309',
  premiumSoft: '#FEF3C7',
};

/* ─────────────────────────────────────────────
   CATEGORY CONFIG
───────────────────────────────────────────── */
const CATEGORIES = ['all', 'Documents', 'Academic', 'Marketing', 'Large Format'];
const CAT_COLORS = {
  Documents:    { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  Academic:     { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  Marketing:    { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  'Large Format': { bg: '#FAF5FF', text: '#7E22CE', dot: '#A855F7' },
};

/* ─────────────────────────────────────────────
   TINY ATOMS
───────────────────────────────────────────── */
const Badge = ({ children, color = T.accentSoft, textColor = T.accent, dot }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    background: color, color: textColor,
    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', padding: '3px 9px', borderRadius: 6,
  }}>
    {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />}
    {children}
  </span>
);

const IconBtn = ({ icon: Icon, onClick, title, color = T.inkMid, hoverBg = T.border, danger, disabled, small }) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.08 }}
    whileTap={{ scale: disabled ? 1 : 0.94 }}
    onClick={disabled ? undefined : onClick}
    title={title}
    disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: small ? 30 : 36, height: small ? 30 : 36, borderRadius: 8,
      border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: 'transparent', color: danger ? T.danger : color,
      opacity: disabled ? 0.35 : 1, transition: 'background 0.15s',
    }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.background = danger ? T.dangerSoft : hoverBg)}
    onMouseLeave={e => !disabled && (e.currentTarget.style.background = 'transparent')}
  >
    <Icon size={small ? 13 : 15} strokeWidth={2.2} />
  </motion.button>
);

const Divider = ({ v }) => (
  <div style={{
    [v ? 'width' : 'height']: 1,
    [v ? 'height' : 'width']: '100%',
    background: T.border,
    flexShrink: 0,
  }} />
);

/* ─────────────────────────────────────────────
   STAT CHIP
───────────────────────────────────────────── */
const StatChip = ({ label, value, accent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 16px', background: T.surface,
    border: `1px solid ${T.border}`, borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }}>
    <span style={{ fontSize: 20, fontWeight: 800, color: accent || T.ink, letterSpacing: '-0.04em' }}>{value}</span>
    <span style={{ fontSize: 12, fontWeight: 500, color: T.inkLight, letterSpacing: '0.02em' }}>{label}</span>
  </div>
);

/* ─────────────────────────────────────────────
   CATEGORY PILL
───────────────────────────────────────────── */
const CatPill = ({ cat, active, onClick, count }) => {
  const cfg = cat === 'all' ? null : CAT_COLORS[cat];
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '7px 14px', borderRadius: 9, fontWeight: 600,
        fontSize: 13, cursor: 'pointer', border: '1.5px solid',
        borderColor: active ? T.accent : T.border,
        background: active ? T.accent : T.surface,
        color: active ? '#fff' : T.inkMid,
        transition: 'all 0.18s', boxShadow: active ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
      }}
    >
      {cfg && <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#fff' : cfg.dot }} />}
      {cat === 'all' ? 'All Services' : cat}
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px',
          background: active ? 'rgba(255,255,255,0.25)' : T.border,
          borderRadius: 20, color: active ? '#fff' : T.inkLight,
        }}>{count}</span>
      )}
    </motion.button>
  );
};

/* ─────────────────────────────────────────────
   FORM FIELD
───────────────────────────────────────────── */
const Field = ({ label, children, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: T.inkMid, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
      {label}{required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 9,
  border: `1.5px solid ${T.border}`, background: T.paper,
  fontSize: 14, color: T.ink, outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

/* ─────────────────────────────────────────────
   CATALOGUE CARD
───────────────────────────────────────────── */
const CatalogueCard = ({ item, onEdit, onDelete, onViewImage, index }) => {
  const catCfg = CAT_COLORS[item.category] || {};
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}
      style={{
        background: T.surface, borderRadius: 16,
        border: `1px solid ${T.border}`, overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.25s, transform 0.25s',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Image area */}
      <div
        style={{
          height: 160, background: T.paper, overflow: 'hidden',
          position: 'relative', cursor: item.image ? 'zoom-in' : 'default',
          flexShrink: 0,
        }}
        onClick={() => item.image && onViewImage(item.image)}
      >
        {item.image ? (
          <>
            <img
              src={item.image} alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 50%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: 8, right: 8,
              background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
              color: '#fff', fontSize: 10, fontWeight: 600,
              padding: '3px 8px', borderRadius: 5, letterSpacing: '0.04em',
            }}>
              <Eye size={9} style={{ display: 'inline', marginRight: 4 }} />VIEW
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 8,
          }}>
            <ImageIcon size={28} color={T.inkFaint} strokeWidth={1.5} />
            <span style={{ fontSize: 11, color: T.inkFaint, fontWeight: 500 }}>No image</span>
          </div>
        )}

        {/* Premium badge */}
        {item.premium && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: T.premiumSoft, color: T.premium,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            padding: '3px 8px', borderRadius: 5, border: `1px solid ${T.warning}30`,
          }}>⭐ PREMIUM</div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0, fontSize: 15, fontWeight: 700, color: T.ink,
              lineHeight: 1.3, letterSpacing: '-0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>{item.name}</h3>
          </div>

          {/* Context menu */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`,
                background: T.paper, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: T.inkLight,
              }}
            >
              <MoreVertical size={13} />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  style={{
                    position: 'absolute', top: 34, right: 0, zIndex: 50,
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    overflow: 'hidden', minWidth: 148,
                  }}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {[
                    { label: 'Edit service', icon: Edit3, action: () => { onEdit(item); setMenuOpen(false); } },
                    { label: 'View image', icon: Eye, action: () => { item.image && onViewImage(item.image); setMenuOpen(false); }, disabled: !item.image },
                    // { label: 'Preview page', icon: Maximize2, action: () => { window.open(`/customer/catalogue/${item.id}`, '_blank'); setMenuOpen(false); } },
                  ].map(({ label, icon: Icon, action, disabled }) => (
                    <button
                      key={label}
                      onClick={disabled ? undefined : action}
                      disabled={disabled}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 14px', border: 'none',
                        background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: 13, color: disabled ? T.inkFaint : T.inkMid,
                        fontFamily: 'inherit', fontWeight: 500, textAlign: 'left',
                      }}
                      onMouseEnter={e => !disabled && (e.currentTarget.style.background = T.paper)}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                  <div style={{ height: 1, background: T.border }} />
                  <button
                    onClick={() => { onDelete(item.id); setMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 14px', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      fontSize: 13, color: T.danger, fontFamily: 'inherit',
                      fontWeight: 500, textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.dangerSoft}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category + tag */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge color={catCfg.bg} textColor={catCfg.text} dot={catCfg.dot}>
            {item.category}
          </Badge>
          {item.tag && (
            <Badge color={T.accentSoft} textColor={T.accent}>{item.tag}</Badge>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p style={{
            margin: 0, fontSize: 12.5, color: T.inkLight, lineHeight: 1.55,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{item.description}</p>
        )}

        {/* Features */}
        {item.features?.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {item.features.slice(0, 3).map((f, i) => (
              <span key={i} style={{
                fontSize: 10.5, fontWeight: 600, color: T.inkMid,
                background: T.paper, border: `1px solid ${T.border}`,
                padding: '2px 7px', borderRadius: 5, letterSpacing: '0.03em',
              }}>{f}</span>
            ))}
            {item.features.length > 3 && (
              <span style={{
                fontSize: 10.5, fontWeight: 600, color: T.inkLight,
                background: T.paper, border: `1px solid ${T.border}`,
                padding: '2px 7px', borderRadius: 5,
              }}>+{item.features.length - 3}</span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Price footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 12, borderTop: `1px solid ${T.border}`, marginTop: 4,
        }}>
          <div>
            <span style={{
              fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: '-0.04em',
            }}>RM {parseFloat(item.price || 0).toFixed(2)}</span>
            <span style={{ fontSize: 11, color: T.inkLight, marginLeft: 4, fontWeight: 500 }}>/page</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <IconBtn icon={Edit3} onClick={() => onEdit(item)} title="Edit" small />
            <IconBtn icon={Trash2} onClick={() => onDelete(item.id)} title="Delete" danger small />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   ADD / EDIT MODAL
───────────────────────────────────────────── */
const ServiceModal = ({ editingItem, formData, setFormData, onClose, onSubmit, uploadingImage, onImageUpload, fileInputRef }) => {
  const isEdit = !!editingItem;

  const handleFocus = e => e.target.style.borderColor = T.accent;
  const handleBlur = e => e.target.style.borderColor = T.border;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', background: 'rgba(10,10,15,0.55)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        style={{
          background: T.surface, borderRadius: 20,
          border: `1px solid ${T.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: 560, maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>
              {isEdit ? 'Edit Service' : 'Add New Service'}
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: T.inkLight, marginTop: 2 }}>
              {isEdit ? `Editing: ${editingItem.name}` : 'Fill in service details below'}
            </p>
          </div>
          <IconBtn icon={X} onClick={onClose} title="Close" />
        </div>

        {/* Modal body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Image upload */}
          <Field label="Service Image">
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${formData.image ? T.success : T.border}`,
                borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                background: formData.image ? T.successSoft : T.paper,
                transition: 'all 0.2s', position: 'relative',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = formData.image ? T.success : T.border}
            >
              {formData.image ? (
                <div style={{ position: 'relative' }}>
                  <img src={formData.image} alt="Preview"
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0)', transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                  >
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, opacity: 0, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >Click to change</span>
                  </div>
                </div>
              ) : (
                <div style={{
                  height: 100, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {uploadingImage ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <RefreshCw size={20} color={T.accent} />
                    </motion.div>
                  ) : (
                    <>
                      <Upload size={20} color={T.inkLight} />
                      <span style={{ fontSize: 12, color: T.inkLight, fontWeight: 500 }}>
                        Click to upload image <span style={{ color: T.inkFaint }}>(max 5MB)</span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={onImageUpload} />
            {formData.image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <CheckCircle size={12} color={T.success} />
                <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>Image uploaded</span>
                <button onClick={e => { e.stopPropagation(); setFormData(p => ({ ...p, image: '' })); }}
                  style={{ marginLeft: 'auto', fontSize: 11, color: T.danger, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Remove
                </button>
              </div>
            )}
          </Field>

          {/* Name */}
          <Field label="Service Name" required>
            <input
              style={inputStyle} placeholder="e.g. A4 Black & White Printing"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              onFocus={handleFocus} onBlur={handleBlur}
            />
          </Field>

          {/* Category + Price row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Category">
              <select
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                value={formData.category}
                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                onFocus={handleFocus} onBlur={handleBlur}
              >
                {['Documents', 'Academic', 'Marketing', 'Large Format'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Price (RM / page)" required>
              <input
                style={inputStyle} type="number" min="0" step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                onFocus={handleFocus} onBlur={handleBlur}
              />
            </Field>
          </div>

          {/* Description */}
          <Field label="Description">
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
              placeholder="Short description visible to customers..."
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              onFocus={handleFocus} onBlur={handleBlur}
            />
          </Field>

          {/* Features */}
          <Field label="Features (comma separated)">
            <input
              style={inputStyle} placeholder="Fast printing, Duplex, Colour accurate"
              value={formData.features}
              onChange={e => setFormData(p => ({ ...p, features: e.target.value }))}
              onFocus={handleFocus} onBlur={handleBlur}
            />
          </Field>

          {/* Tag + Premium row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'end' }}>
            <Field label="Tag">
              <select
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                value={formData.tag}
                onChange={e => setFormData(p => ({ ...p, tag: e.target.value }))}
                onFocus={handleFocus} onBlur={handleBlur}
              >
                {['Essential', 'Popular', 'Best Value', 'New', 'Limited'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${formData.premium ? T.warning : T.border}`,
              background: formData.premium ? T.warningSoft : T.paper,
              transition: 'all 0.18s', userSelect: 'none', marginBottom: 0,
            }}>
              <input type="checkbox" checked={formData.premium}
                onChange={e => setFormData(p => ({ ...p, premium: e.target.checked }))}
                style={{ accentColor: T.warning }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: formData.premium ? T.premium : T.inkMid }}>
                ⭐ Premium
              </span>
            </label>
          </div>
        </div>

        {/* Modal footer */}
        <div style={{
          display: 'flex', gap: 10, padding: '16px 24px',
          borderTop: `1px solid ${T.border}`, flexShrink: 0,
          background: T.paper,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${T.border}`,
              background: T.surface, color: T.inkMid, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.paper}
            onMouseLeave={e => e.currentTarget.style.background = T.surface}
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onSubmit}
            style={{
              flex: 2, padding: '10px', borderRadius: 10, border: 'none',
              background: T.accent, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 12px rgba(79,70,229,0.35)',
            }}
          >
            <Save size={15} />
            {isEdit ? 'Save Changes' : 'Add Service'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   IMAGE MODAL
───────────────────────────────────────────── */
const ImageModal = ({ src, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{
      position: 'fixed', inset: 0, zIndex: 70,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, cursor: 'zoom-out',
    }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.88, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', cursor: 'default' }}
      onClick={e => e.stopPropagation()}
    >
      <img src={src} alt="Full preview" style={{
        maxWidth: '100%', maxHeight: '88vh', borderRadius: 16,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'block',
      }} />

      {/* Controls */}
      <div style={{
        position: 'absolute', top: -50, right: 0,
        display: 'flex', gap: 8,
      }}>
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => { navigator.clipboard.writeText(src); toast.success('URL copied'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12.5,
            fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(6px)',
            fontFamily: 'inherit',
          }}>
          <Share2 size={13} /> Copy URL
        </motion.button>
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
          }}>
          <X size={16} />
        </motion.button>
      </div>
    </motion.div>
  </motion.div>
);

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const CatalogueAdmin = () => {
  const [catalogue, setCatalogue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const defaultForm = {
    name: '', category: 'Documents', price: 0,
    description: '', features: '', tag: 'Essential',
    premium: false, image: '',
  };
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'catalogue'), (snapshot) => {
      setCatalogue(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredCatalogue = catalogue.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || item.category === filterCategory;
    return matchSearch && matchCat;
  });

  // Category counts
  const catCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === 'all' ? catalogue.length : catalogue.filter(i => i.category === cat).length;
    return acc;
  }, {});

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingItem(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploadingImage(true);
    const t = toast.loading('Uploading image…');
    try {
      const storageRefPath = ref(storage, `catalogue/${Date.now()}_${file.name}`);
      await uploadBytes(storageRefPath, file);
      const url = await getDownloadURL(storageRefPath);
      setFormData(p => ({ ...p, image: url }));
      toast.success('Image uploaded', { id: t });
    } catch { toast.error('Upload failed', { id: t }); }
    finally { setUploadingImage(false); }
  };


  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) { toast.error('Service name is required'); return; }

    const parsedPrice = parseFloat(formData.price);
    if (formData.price === '' || isNaN(parsedPrice)) {
      toast.error('Validation Error: Price is required and cannot be empty.');
      return;
    }
    if (parsedPrice < 0) {
      toast.error('Validation Error: Price cannot be negative.');
      return;
    }

    const t = toast.loading(editingItem ? 'Saving…' : 'Adding…');
    try {
      const payload = {
        name: formData.name.trim(), category: formData.category,
        price: parseFloat(formData.price) || 0,
        description: formData.description.trim(),
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
        tag: formData.tag, premium: formData.premium,
        image: formData.image || '', updatedAt: serverTimestamp(),
      };
      if (editingItem) {
        await updateDoc(doc(db, 'catalogue', editingItem.id), payload);
        toast.success('Service updated', { id: t });
      } else {
        await addDoc(collection(db, 'catalogue'), { ...payload, createdAt: serverTimestamp() });
        toast.success('Service added', { id: t });
      }
      resetForm(); setShowAddForm(false);
    } catch { toast.error('Operation failed', { id: t }); }
  };

  const deleteItem = async (id) => {
    const item = catalogue.find(c => c.id === id);
    if (!window.confirm(`Delete "${item?.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'catalogue', id));
      toast.success('Service deleted');
    } catch { toast.error('Delete failed'); }
  };

  const editItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '', category: item.category || 'Documents',
      price: item.price || 0, description: item.description || '',
      features: Array.isArray(item.features) ? item.features.join(', ') : (item.features || ''),
      tag: item.tag || 'Essential', premium: item.premium || false,
      image: item.image || '',
    });
    setShowAddForm(true);
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.paper, flexDirection: 'column', gap: 16,
    }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
        <RefreshCw size={28} color={T.accent} />
      </motion.div>
      <p style={{ fontSize: 15, color: T.inkLight, fontWeight: 500 }}>Loading catalogue…</p>
    </div>
  );

  /* ── Render ── */
  return (
    <div style={{
      minHeight: '100vh', background: T.paper,
      fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
    }}>

      {/* ── TOP BAR ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(250,250,249,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${T.border}`,
          padding: '0 32px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: '-0.02em' }}>
              Catalogue
            </span>
            <span style={{ fontSize: 11, color: T.inkLight, marginLeft: 8, fontWeight: 500 }}>
              Management
            </span>
          </div>
          <div style={{ marginLeft: 8, width: 8, height: 8, borderRadius: '50%', background: T.success, boxShadow: `0 0 0 3px ${T.successSoft}` }} title="Live sync" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { resetForm(); setShowAddForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
              background: T.accent, color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: '0.01em', boxShadow: '0 2px 10px rgba(79,70,229,0.3)',
            }}
          >
            <Plus size={15} strokeWidth={2.5} /> Add Service
          </motion.button>
        </div>
      </motion.div>

      {/* ── PAGE CONTENT ── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 32px 64px' }}>

        {/* PAGE HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{
                margin: 0, fontSize: 28, fontWeight: 800, color: T.ink,
                letterSpacing: '-0.04em', lineHeight: 1.15,
              }}>Service Catalogue</h1>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: T.inkLight, fontWeight: 400 }}>
                Manage your print and document services
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <StatChip label="Total" value={catalogue.length} accent={T.accent} />
              <StatChip label="Filtered" value={filteredCatalogue.length} />
              <StatChip label="Premium" value={catalogue.filter(i => i.premium).length} accent={T.premium} />
            </div>
          </div>
        </motion.div>

        {/* TOOLBAR */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search size={14} color={T.inkFaint} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              style={{
                ...inputStyle,
                paddingLeft: 36, paddingTop: 8, paddingBottom: 8,
                fontSize: 13.5,
              }}
              placeholder="Search services…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: T.inkFaint, padding: 2,
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Divider v />

          {/* Category filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, color: T.inkFaint, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 4 }}>Filter:</span>
            {CATEGORIES.map(cat => (
              <CatPill
                key={cat}
                cat={cat}
                active={filterCategory === cat}
                onClick={() => setFilterCategory(cat)}
                count={catCounts[cat]}
              />
            ))}
          </div>
        </motion.div>

        {/* GRID */}
        <AnimatePresence mode="popLayout">
          {filteredCatalogue.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                gridColumn: '1/-1', textAlign: 'center',
                padding: '80px 20px',
                background: T.surface, borderRadius: 16,
                border: `1px solid ${T.border}`,
              }}
            >
              <ImageIcon size={40} color={T.inkFaint} strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.inkMid }}>No services found</h3>
              <p style={{ margin: '8px 0 0', fontSize: 13.5, color: T.inkLight }}>
                {searchTerm ? `No results for "${searchTerm}"` : 'Add your first service to get started'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    marginTop: 16, padding: '8px 18px', borderRadius: 8,
                    border: `1px solid ${T.border}`, background: T.surface,
                    fontSize: 13, color: T.inkMid, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                  }}
                >Clear search</button>
              )}
            </motion.div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
            }}>
              {filteredCatalogue.map((item, index) => (
                <CatalogueCard
                  key={item.id}
                  item={item}
                  index={index}
                  onEdit={editItem}
                  onDelete={deleteItem}
                  onViewImage={setShowImageModal}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showAddForm && (
          <ServiceModal
            key="service-modal"
            editingItem={editingItem}
            formData={formData}
            setFormData={setFormData}
            onClose={() => { setShowAddForm(false); resetForm(); }}
            onSubmit={handleSubmit}
            uploadingImage={uploadingImage}
            onImageUpload={handleImageUpload}
            fileInputRef={fileInputRef}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImageModal && (
          <ImageModal key="image-modal" src={showImageModal} onClose={() => setShowImageModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CatalogueAdmin;