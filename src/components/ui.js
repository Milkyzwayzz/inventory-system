/**
 * ui.jsx 
 * Aesthetic: Dark-industrial / refined terminal
 * Accent: Electric indigo + warm amber
 * All components are self-contained — no external CSS required beyond Tailwind.
 */

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  X, Loader2, Check, AlertCircle, Info, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────
export const cn = (...classes) => classes.filter(Boolean).join(' ');

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS  (use these in page-level code for consistency)
// ─────────────────────────────────────────────────────────────────────────────
export const tokens = {
  // Surface layers
  surface0: 'bg-[#0d0f14]',          // page background
  surface1: 'bg-[#13161e]',          // card base
  surface2: 'bg-[#1a1e28]',          // elevated card / panel
  surface3: 'bg-[#21263300]',        // hover / selected overlay

  // Borders
  border: 'border-[#2a2f3d]',
  borderFocus: 'border-indigo-500',
  borderHover: 'border-[#3d4559]',

  // Text
  textPrimary: 'text-[#eef0f6]',
  textSecondary: 'text-[#8b91a8]',
  textMuted: 'text-[#4e5568]',

  // Accents
  accentPrimary: 'indigo',
  accentWarm: 'amber',
  accentSuccess: 'emerald',
  accentDanger: 'rose',
};

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────────────────────
const BUTTON_VARIANTS = {
  primary: [
    'bg-indigo-600 hover:bg-indigo-500 text-white',
    'shadow-[0_0_24px_-4px_theme(colors.indigo.600/50%)]',
    'hover:shadow-[0_0_32px_-4px_theme(colors.indigo.500/70%)]',
    'border border-indigo-500/40',
    'focus:ring-indigo-500/40',
  ].join(' '),

  secondary: [
    'bg-[#1a1e28] hover:bg-[#21263300] text-[#eef0f6]',
    'border border-[#2a2f3d] hover:border-[#3d4559]',
    'focus:ring-[#3d4559]/60',
  ].join(' '),

  outline: [
    'bg-transparent text-indigo-400 hover:text-indigo-300',
    'border-2 border-indigo-500/40 hover:border-indigo-400/70',
    'hover:bg-indigo-500/10',
    'focus:ring-indigo-500/30',
  ].join(' '),

  ghost: [
    'bg-transparent hover:bg-white/5 text-[#8b91a8] hover:text-[#eef0f6]',
    'border border-transparent',
    'focus:ring-white/10',
  ].join(' '),

  danger: [
    'bg-rose-600/90 hover:bg-rose-500 text-white',
    'shadow-[0_0_20px_-4px_theme(colors.rose.600/40%)]',
    'hover:shadow-[0_0_28px_-4px_theme(colors.rose.500/60%)]',
    'border border-rose-500/40',
    'focus:ring-rose-500/40',
  ].join(' '),

  success: [
    'bg-emerald-600/90 hover:bg-emerald-500 text-white',
    'shadow-[0_0_20px_-4px_theme(colors.emerald.600/40%)]',
    'border border-emerald-500/40',
    'focus:ring-emerald-500/40',
  ].join(' '),

  amber: [
    'bg-amber-500/90 hover:bg-amber-400 text-[#0d0f14]',
    'shadow-[0_0_20px_-4px_theme(colors.amber.500/40%)]',
    'border border-amber-400/40',
    'focus:ring-amber-400/40',
  ].join(' '),
};

const BUTTON_SIZES = {
  xs: 'px-3 py-1.5 text-xs   h-7  gap-1.5 rounded-xl',
  sm: 'px-4 py-2   text-sm   h-9  gap-2   rounded-xl',
  md: 'px-5 py-2.5 text-sm   h-11 gap-2   rounded-2xl',
  lg: 'px-7 py-3   text-base h-13 gap-2.5 rounded-2xl',
  xl: 'px-9 py-4   text-lg   h-16 gap-3   rounded-2xl',
};

export const Button = React.forwardRef(({
  children, variant = 'primary', size = 'md',
  loading = false, icon: Icon, className = '', ...props
}, ref) => (
  <motion.button
    ref={ref}
    disabled={loading || props.disabled}
    whileHover={!props.disabled && !loading ? { scale: 1.02 } : {}}
    whileTap={!props.disabled && !loading ? { scale: 0.97 } : {}}
    className={cn(
      'inline-flex items-center justify-center font-bold tracking-wide',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d0f14]',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
      BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary,
      BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
      className,
    )}
    {...props}
  >
    {loading
      ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
      : Icon
        ? <Icon className="w-4 h-4 flex-shrink-0" />
        : null
    }
    {children}
  </motion.button>
));
Button.displayName = 'Button';

// ─────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef(({
  label, className = '', icon: Icon, error, hint, ...props
}, ref) => (
  <div className="space-y-2 w-full">
    {label && (
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#4e5568]">
        {label}
      </label>
    )}
    <div className="relative group">
      {Icon && (
        <Icon className={cn(
          'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors',
          'text-[#4e5568] group-focus-within:text-indigo-400',
        )} />
      )}
      <input
        ref={ref}
        className={cn(
          'w-full py-3 text-sm font-medium',
          Icon ? 'pl-10 pr-4' : 'px-4',
          'bg-[#13161e] border rounded-2xl',
          'text-[#eef0f6] placeholder:text-[#4e5568]',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500',
          error
            ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
            : 'border-[#2a2f3d] hover:border-[#3d4559]',
          className,
        )}
        {...props}
      />
    </div>
    {error && (
      <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
        <AlertCircle size={12} /> {error}
      </p>
    )}
    {hint && !error && (
      <p className="flex items-center gap-1.5 text-xs text-[#4e5568]">
        <Info size={12} /> {hint}
      </p>
    )}
  </div>
));
Input.displayName = 'Input';

// ─────────────────────────────────────────────────────────────────────────────
// SELECT  (styled native select — no Radix needed)
// ─────────────────────────────────────────────────────────────────────────────
export const Select = React.forwardRef(({
  label, children, className = '', error, ...props
}, ref) => (
  <div className="space-y-2 w-full">
    {label && (
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#4e5568]">
        {label}
      </label>
    )}
    <div className="relative group">
      <select
        ref={ref}
        className={cn(
          'w-full py-3 pl-4 pr-9 text-sm font-medium',
          'bg-[#13161e] border rounded-2xl appearance-none cursor-pointer',
          'text-[#eef0f6]',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500',
          error
            ? 'border-rose-500/60'
            : 'border-[#2a2f3d] hover:border-[#3d4559]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4e5568] pointer-events-none" />
    </div>
    {error && (
      <p className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
        <AlertCircle size={12} /> {error}
      </p>
    )}
  </div>
));
Select.displayName = 'Select';

// ─────────────────────────────────────────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────────────────────────────────────────
const BADGE_VARIANTS = {
  default: 'bg-[#1a1e28] text-[#8b91a8] border border-[#2a2f3d]',
  primary: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  outline: 'bg-transparent text-[#8b91a8] border-2 border-[#2a2f3d]',
};
const BADGE_SIZES = {
  xs: 'px-2 py-0.5 text-[9px]  rounded-lg',
  sm: 'px-2.5 py-1 text-[10px] rounded-xl',
  md: 'px-3 py-1   text-xs     rounded-xl',
  lg: 'px-4 py-1.5 text-sm     rounded-xl',
};

export const Badge = ({
  children, variant = 'default', size = 'sm', className = '', dot = false, ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 font-black uppercase tracking-widest',
      BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.default,
      BADGE_SIZES[size] ?? BADGE_SIZES.sm,
      className,
    )}
    {...props}
  >
    {dot && (
      <span className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        variant === 'success' ? 'bg-emerald-400' :
          variant === 'danger' ? 'bg-rose-400' :
            variant === 'warning' ? 'bg-amber-400' :
              variant === 'info' ? 'bg-sky-400' :
                'bg-indigo-400',
      )} />
    )}
    {children}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────────────────────
export const Card = React.forwardRef(({
  children, className = '', hoverable = false, glow = false, ...props
}, ref) => (
  <motion.div
    ref={ref}
    whileHover={hoverable ? { y: -4, scale: 1.01 } : {}}
    className={cn(
      'bg-[#13161e] border border-[#2a2f3d] rounded-3xl overflow-hidden',
      'transition-all duration-300',
      hoverable && 'hover:border-[#3d4559] hover:shadow-2xl cursor-pointer',
      glow && 'hover:shadow-[0_0_40px_-8px_theme(colors.indigo.600/30%)]',
      className,
    )}
    {...props}
  >
    {children}
  </motion.div>
));
Card.displayName = 'Card';

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD  (page-level ready-made widget)
// ─────────────────────────────────────────────────────────────────────────────
export const StatCard = ({ icon: Icon, label, value, sub, accentClass = 'text-indigo-400', glowClass = 'shadow-indigo-600/20' }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'bg-[#13161e] border border-[#2a2f3d] rounded-2xl p-4 flex items-center gap-4',
      'hover:border-[#3d4559] transition-all duration-200',
      `hover:shadow-xl hover:${glowClass}`,
    )}
  >
    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center bg-[#1a1e28] border border-[#2a2f3d]', accentClass)}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4e5568] truncate">{label}</p>
      <p className="text-xl font-black text-[#eef0f6] leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-[#4e5568] font-medium">{sub}</p>}
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MODAL  (Radix Dialog, dark-themed)
// ─────────────────────────────────────────────────────────────────────────────
export const Modal = ({ children, title, open, onOpenChange, size = 'lg', className = '' }) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <AnimatePresence>
        {open && (
          <>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#0d0f14]/80 backdrop-blur-xl z-50"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                key="content"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={cn(
                  'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                  'bg-[#13161e] border border-[#2a2f3d] rounded-3xl overflow-hidden',
                  'shadow-[0_0_80px_-12px_theme(colors.indigo.600/25%)]',
                  'w-[95vw] max-h-[92vh] overflow-y-auto p-8',
                  size === 'sm' ? 'max-w-md' : size === 'md' ? 'max-w-xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-5xl',
                  className,
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#2a2f3d]">
                  <h3 className="text-2xl font-black text-[#eef0f6] tracking-tight">{title}</h3>
                  <DialogPrimitive.Close asChild>
                    <motion.button
                      whileHover={{ rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-9 h-9 rounded-xl bg-[#1a1e28] border border-[#2a2f3d] text-[#4e5568] hover:text-[#eef0f6] hover:border-[#3d4559] flex items-center justify-center transition-all"
                    >
                      <X size={18} />
                    </motion.button>
                  </DialogPrimitive.Close>
                </div>
                <div className="space-y-6">{children}</div>
              </motion.div>
            </DialogPrimitive.Content>
          </>
        )}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

// ─────────────────────────────────────────────────────────────────────────────
// ICON BUTTON
// ─────────────────────────────────────────────────────────────────────────────
export const IconButton = ({
  icon: Icon, label, variant = 'ghost', size = 'md', className = '', ...props
}) => {
  const sz = { sm: 'w-8 h-8', md: 'w-9 h-9', lg: 'w-11 h-11' }[size] ?? 'w-9 h-9';
  const ic = { sm: 14, md: 16, lg: 18 }[size] ?? 16;
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      title={label}
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-xl transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
        sz,
        variant === 'ghost' ? 'bg-transparent hover:bg-white/5 text-[#8b91a8] hover:text-[#eef0f6]' :
          variant === 'surface' ? 'bg-[#1a1e28] border border-[#2a2f3d] hover:border-[#3d4559] text-[#8b91a8] hover:text-[#eef0f6]' :
            variant === 'danger' ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20' :
              variant === 'success' ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20' :
                'bg-[#1a1e28] hover:bg-[#21263300] text-[#8b91a8]',
        className,
      )}
      {...props}
    >
      <Icon size={ic} />
    </motion.button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE  (boolean switch)
// ─────────────────────────────────────────────────────────────────────────────
export const Toggle = ({ checked, onChange, label, accent = 'indigo' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 group"
  >
    <div className={cn(
      'relative w-11 h-6 rounded-full border transition-all duration-300',
      checked
        ? `bg-${accent}-600 border-${accent}-500`
        : 'bg-[#1a1e28] border-[#2a2f3d] group-hover:border-[#3d4559]',
    )}>
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md',
          checked ? 'left-6' : 'left-0.5',
        )}
      />
    </div>
    {label && (
      <span className="text-xs font-bold text-[#8b91a8] group-hover:text-[#eef0f6] transition-colors uppercase tracking-wider">
        {label}
      </span>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
export const Separator = ({ className = '', label }) => (
  <div className={cn('flex items-center gap-4', className)}>
    <div className="flex-1 h-px bg-[#2a2f3d]" />
    {label && <span className="text-[10px] font-black uppercase tracking-widest text-[#4e5568] flex-shrink-0">{label}</span>}
    <div className="flex-1 h-px bg-[#2a2f3d]" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 'md', className = '' }) => {
  const sz = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-[3px]', lg: 'w-12 h-12 border-4' }[size] ?? 'w-7 h-7 border-[3px]';
  return (
    <div className={cn(sz, 'border-[#2a2f3d] border-t-indigo-500 rounded-full animate-spin', className)} />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP  (Radix)
// ─────────────────────────────────────────────────────────────────────────────
export const Tooltip = ({ children, content, side = 'top' }) => (
  <TooltipPrimitive.Provider delayDuration={300}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold text-[#eef0f6]',
            'bg-[#1a1e28] border border-[#2a2f3d]',
            'shadow-xl shadow-black/40',
            'animate-in fade-in-0 zoom-in-95 duration-150',
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[#2a2f3d]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
export const ProgressBar = ({ value = 0, max = 100, className = '', accentClass = 'bg-indigo-500' }) => (
  <div className={cn('w-full h-1.5 bg-[#1a1e28] rounded-full overflow-hidden border border-[#2a2f3d]', className)}>
    <motion.div
      className={cn('h-full rounded-full', accentClass)}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT CONTROL  (replaces tab toggle pattern)
// ─────────────────────────────────────────────────────────────────────────────
export const SegmentControl = ({ options = [], value, onChange, className = '' }) => (
  <div className={cn('flex gap-1 p-1 bg-[#0d0f14] border border-[#2a2f3d] rounded-2xl', className)}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={cn(
          'flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap',
          value === opt.value
            ? 'bg-indigo-600 text-white shadow-[0_0_16px_-4px_theme(colors.indigo.600/60%)]'
            : 'text-[#4e5568] hover:text-[#8b91a8]',
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 bg-[#1a1e28] border border-[#2a2f3d] rounded-3xl flex items-center justify-center mb-5 text-[#2a2f3d]">
      <Icon size={40} />
    </div>
    <p className="font-black text-[#4e5568] uppercase tracking-widest text-sm mb-1">{title}</p>
    {description && <p className="text-xs text-[#4e5568] font-medium mb-6 max-w-xs">{description}</p>}
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS for Radix namespaces (backward-compat)
// ─────────────────────────────────────────────────────────────────────────────
export const DropdownMenu = DropdownMenuPrimitive;
export const Dialog = DialogPrimitive;

// Named convenience re-export so old code still works
export const BadgeOutline = (props) => <Badge variant="outline" {...props} />;