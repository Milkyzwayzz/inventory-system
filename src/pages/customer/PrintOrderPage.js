// src/pages/PrintOrderPage.jsx

import React, {
  useState, useEffect, useCallback, useRef, useMemo, useReducer
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCustomer } from './CustomerPortal';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, Upload, CheckCircle2, Loader2,
  Trash2, File, Clock, ChevronDown,
  CheckCircle, AlertTriangle, CreditCard, Smartphone,
  Building2, Lock, Shield, ArrowRight, Sparkles, X,
  Star, Package, Minus, Plus
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// ──────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ──────────────────────────────────────────────────────────────────
const ink = '#0F172A';
const gold = '#7C3AED';
const goldL = '#C4B5FD';
const cream = '#F4F5F7';
const slate = '#64748B';

// ──────────────────────────────────────────────────────────────────
// CHECKOUT STEPS
// ──────────────────────────────────────────────────────────────────
const STEPS = ['Upload', 'Customize', 'Review & Pay'];

const ProgressSteps = ({ current }) => (
  <div className="flex items-center gap-2 mb-10">
    {STEPS.map((step, i) => (
      <React.Fragment key={step}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div
            initial={false}
            animate={{
              background: i <= current ? gold : '#E5E7EB',
              color: i <= current ? '#FFFFFF' : slate,
              scale: i === current ? 1.08 : 1,
            }}
            transition={{ duration: 0.25 }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm"
          >
            {i < current ? <CheckCircle2 size={16} /> : i + 1}
          </motion.div>
          <span
            className="text-xs font-bold uppercase tracking-wider hidden sm:inline transition-colors"
            style={{ color: i <= current ? ink : slate }}
          >
            {step}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-200 min-w-[24px]">
            <motion.div
              initial={false}
              animate={{ width: i < current ? '100%' : '0%' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: gold }}
            />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ──────────────────────────────────────────────────────────────────
// COUNTER INPUT (Pages / Copies)
// ──────────────────────────────────────────────────────────────────
const CounterInput = ({ label, value, onChange, min = 1, max = 999 }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: slate }}>
      {label}
    </label>
    <div
      className="flex items-center border-2 rounded-xl overflow-hidden transition-colors"
      style={{ borderColor: '#E5E7EB' }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.max(min, (parseInt(value) || min) - 1))}
        className="w-12 h-14 flex items-center justify-center flex-shrink-0 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: ink }}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus size={18} />
      </motion.button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          onChange(Number.isNaN(v) ? min : Math.min(max, Math.max(min, v)));
        }}
        className="flex-1 w-full h-14 text-center font-black text-2xl focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        style={{ color: ink }}
      />
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.min(max, (parseInt(value) || min) + 1))}
        className="w-12 h-14 flex items-center justify-center flex-shrink-0 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: ink }}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus size={18} />
      </motion.button>
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────
// TOGGLE SWITCH
// ──────────────────────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="relative inline-flex items-center h-7 w-12 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2"
    style={{
      background: checked ? gold : '#E2E8F0',
      '--tw-ring-color': gold,
    }}
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
      style={{ marginLeft: checked ? '26px' : '4px' }}
    />
  </button>
);

// ──────────────────────────────────────────────────────────────────
// FALLBACK CATALOGUE DATA
// ──────────────────────────────────────────────────────────────────
const FALLBACK_ITEMS = [
  {
    id: 'a4-bw',
    name: 'Standard A4 B&W',
    category: 'Documents',
    price: 0.15,
    description: 'Quality 80gsm paper, ideal for assignments and notes.',
    features: ['80gsm Bond', 'Sharp Text', 'Fast-dry'],
    tag: 'Essential',
    premium: false,
    printTypes: ['document'],
    colorOptions: ['bw'],
    paperSizes: ['A4'],
    bindingOptions: ['none', 'staple'],
    estimatedTurnaround: '24 hours',
  },
  {
    id: 'a4-color',
    name: 'Premium A4 Color',
    category: 'Documents',
    price: 0.80,
    description: 'Vibrant CMYK output for presentations and reports.',
    features: ['Full Color', 'High Saturation', 'Smudge-proof'],
    tag: 'Popular',
    premium: false,
    printTypes: ['document', 'photo'],
    colorOptions: ['color'],
    paperSizes: ['A4'],
    bindingOptions: ['none', 'staple'],
    estimatedTurnaround: '24 hours',
  },
  {
    id: 'thesis',
    name: 'Thesis / Book Printing',
    category: 'Academic',
    price: 0.25,
    description: 'Professional binding options for long documents.',
    features: ['Spiral/Hardcover', 'Index Tabs', 'Double Sided'],
    tag: 'Bestseller',
    premium: true,
    printTypes: ['book', 'document'],
    colorOptions: ['bw', 'color'],
    paperSizes: ['A4'],
    bindingOptions: ['spiral', 'hardcover', 'softcover'],
    estimatedTurnaround: '2-3 days',
  },
  {
    id: 'poster',
    name: 'A3 Poster Printing',
    category: 'Large Format',
    price: 2.50,
    description: 'Large-scale posters on glossy or matte stock.',
    features: ['UV Resistant', 'Glossy Finish', 'Wide Format'],
    tag: 'High Impact',
    premium: false,
    printTypes: ['photo', 'document'],
    colorOptions: ['color'],
    paperSizes: ['A3'],
    bindingOptions: ['none'],
    estimatedTurnaround: '1-2 days',
  },
];

// ──────────────────────────────────────────────────────────────────
// PAYMENT GATEWAY COMPONENT
// ──────────────────────────────────────────────────────────────────
const PaymentGateway = ({ totalPrice, onSuccess, onCancel, onTimeout }) => {
  const [method, setMethod] = useState('ewallet'); // 'ewallet' | 'fpx' | 'qr'
  const [walletProvider, setWalletProvider] = useState('');
  const [fpxBank, setFpxBank] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'success'
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeout]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const FPX_BANKS = [
    'Maybank2U', 'CIMB Clicks', 'Public Bank', 'RHB Online',
    'Hong Leong Connect', 'AmOnline', 'Alliance Bank', 'Bank Islam',
    'Bank Rakyat', 'BSN', 'OCBC', 'Standard Chartered',
  ];

  const EWALLETS = ['Touch n Go eWallet', 'GrabPay', 'Boost', 'ShopeePay', 'MAE'];

  const handlePay = async () => {
    if (method === 'ewallet' && !walletProvider) {
      toast.error('Select an e-wallet');
      return;
    }
    if (method === 'fpx' && !fpxBank) {
      toast.error('Select your bank');
      return;
    }

    setProcessing(true);
    setStep('processing');

    // Simulate payment processing (replace with real Stripe/Billplz/iPay88 SDK)
    await new Promise((r) => setTimeout(r, 2200));

    setStep('success');
    await new Promise((r) => setTimeout(r, 800));

    const paymentToken = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    onSuccess({
      method,
      provider: method === 'ewallet' ? walletProvider : method === 'fpx' ? fpxBank : 'DuitNow QR',
      paymentToken,
      last4: null
    });
  };

  // ── Processing screen
  if (step === 'processing') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(12px)' }}
      >
        <div className="text-center space-y-6 px-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="w-20 h-20 rounded-full border-4 mx-auto"
            style={{ borderColor: `${gold} transparent ${gold} transparent` }}
          />
          <div>
            <p className="text-white text-2xl font-black mb-2">Processing Payment</p>
            <p style={{ color: goldL }} className="font-semibold">
              RM {totalPrice} • Please don't close this page
            </p>
          </div>
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                className="w-2 h-2 rounded-full"
                style={{ background: gold }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26 }}
        className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #FFF5F5, #FEE2E2)', borderBottom: '1px solid #FCA5A5' }}>
          <div className="flex items-center gap-3">
            <Shield size={20} style={{ color: '#DC2626' }} />
            <div>
              <span className="text-slate-900 font-black text-sm block">Secure Checkout</span>
              <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                <Clock size={12} className="animate-spin" /> Expires in {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-black text-xl text-red-600">
              RM {totalPrice}
            </span>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Method Tabs */}
        <div className="flex border-b" style={{ borderColor: '#E5E7EB' }}>
          {[
            { id: 'ewallet', label: 'E-Wallet', Icon: Smartphone },
            { id: 'fpx', label: 'FPX', Icon: Building2 },
            { id: 'qr', label: 'QR Pay', Icon: Smartphone },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all"
              style={{
                color: method === id ? ink : slate,
                borderBottom: method === id ? `3px solid ${gold}` : '3px solid transparent',
                background: method === id ? '#DCFCE7' : 'white',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* ── E-wallet Form */}
          {method === 'ewallet' && (
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: slate }}>
                Select E-wallet
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EWALLETS.map((wallet) => (
                  <button
                    key={wallet}
                    type="button"
                    onClick={() => setWalletProvider(wallet)}
                    className="px-3 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all"
                    style={{
                      borderColor: walletProvider === wallet ? gold : '#E5E7EB',
                      background: walletProvider === wallet ? '#F0FDF4' : 'white',
                      color: walletProvider === wallet ? ink : slate,
                    }}
                  >
                    {wallet}
                  </button>
                ))}
              </div>

              {walletProvider && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold"
                  style={{ background: '#F0FDF4', color: '#166534' }}
                >
                  <CheckCircle size={16} />
                  Payment token will be issued by {walletProvider}
                </div>
              )}
            </div>
          )}

          {/* ── FPX Form */}
          {method === 'fpx' && (
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: slate }}>
                Select Your Bank
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {FPX_BANKS.map((bank) => (
                  <button
                    key={bank}
                    onClick={() => setFpxBank(bank)}
                    className="px-3 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all"
                    style={{
                      borderColor: fpxBank === bank ? gold : '#E5E7EB',
                      background: fpxBank === bank ? '#FFFBF5' : 'white',
                      color: fpxBank === bank ? ink : slate,
                    }}
                  >
                    {bank}
                  </button>
                ))}
              </div>
              {fpxBank && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold"
                  style={{ background: '#F0FDF4', color: '#166534' }}
                >
                  <CheckCircle size={16} />
                  You'll be redirected to {fpxBank}
                </div>
              )}
            </div>
          )}

          {/* ── QR Pay */}
          {method === 'qr' && (
            <div className="text-center space-y-4 py-2">
              <p className="text-sm font-semibold" style={{ color: slate }}>
                Scan with DuitNow / Touch 'n Go / Boost
              </p>
              {/* QR Placeholder */}
              <div
                className="w-48 h-48 mx-auto rounded-2xl flex items-center justify-center border-4"
                style={{ borderColor: ink, background: cream }}
              >
                <div className="grid grid-cols-3 gap-1 p-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded"
                      style={{ background: i % 3 === 0 ? ink : i % 2 === 0 ? gold : cream }}
                    />
                  ))}
                </div>
              </div>
              <div className="text-2xl font-black" style={{ color: ink }}>
                RM {totalPrice}
              </div>
              <p className="text-xs" style={{ color: slate }}>
                QR expires in 10:00 minutes
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>Warning: No refund or return for the money transferred.</span>
          </div>

          {/* Pay Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePay}
            disabled={processing}
            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 mt-2 shadow-md"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white' }}
          >
            <span style={{ color: gold }}>RM {totalPrice}</span>
            <span>—</span>
            <span>Pay Now</span>
            <ArrowRight size={20} style={{ color: gold }} />
          </motion.button>

          <p className="text-center text-xs" style={{ color: slate }}>
            Secured by SSL encryption. E-wallet payment token is stored for audit.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────
const PrintOrderPage = () => {
  const { catalogueItemId } = useParams();
  const location = useLocation();
  const { user, loading: contextLoading } = useCustomer();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingJobId, setPendingJobId] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [successfulPaymentToken, setSuccessfulPaymentToken] = useState('');

  const formReducer = useCallback((state, action) => {
    switch (action.type) {
      case 'UPDATE_FIELD':
        return { ...state, [action.field]: action.value };
      case 'RESET_FORM':
        return {
          pages: 1, copies: 1, color: 'bw', binding: 'none', paperSize: 'A4', printType: 'document',
          includeCoverPage: false, coverTitle: '', coverSubtitle: '', coverColor: 'bw',
          distanceKm: 0, deliverySelected: false, deliveryName: '', deliveryPhone: '', deliveryAddress: '',
          notes: '', isThesis: false, goldEmbossing: false
        };
      default:
        return state;
    }
  }, []);

  const [formData, dispatch] = useReducer(formReducer, {
    pages: 1, copies: 1, color: 'bw', binding: 'none', paperSize: 'A4', printType: 'document',
    includeCoverPage: false, coverTitle: '', coverSubtitle: '', coverColor: 'bw',
    distanceKm: 0, deliverySelected: false, deliveryName: '', deliveryPhone: '', deliveryAddress: '',
    notes: '', isThesis: false, goldEmbossing: false
  });

  const updateFormField = useCallback((field, value) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
  }, []);

  useEffect(() => {
    if (formData.pages <= 5 && formData.binding !== 'none') {
      updateFormField('binding', 'none');
      toast.info('Binding option disabled for documents under 6 pages');
    }
  }, [formData.pages, formData.binding, updateFormField]);

  const catalogueItem = useMemo(() => {
    if (location.state?.catalogueItem) {
      const item = location.state.catalogueItem;
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0.50,
        description: item.description || item.desc || '',
        features: item.features || [],
        tag: item.tag || item.category,
        premium: item.premium || false,
        printTypes: item.printTypes || ['document'],
        colorOptions: item.colorOptions || ['bw', 'color'],
        paperSizes: item.paperSizes || ['A4'],
        bindingOptions: item.bindingOptions || ['none'],
        estimatedTurnaround: item.estimatedTurnaround || '2-3 days',
      };
    }
    if (catalogueItemId) return FALLBACK_ITEMS.find((i) => i.id === catalogueItemId);
    return null;
  }, [catalogueItemId, location.state]);

  useEffect(() => {
    if (!catalogueItem) return;
    dispatch({ type: 'UPDATE_FIELD', field: 'printType', value: catalogueItem.printTypes?.[0] || 'document' });
    dispatch({ type: 'UPDATE_FIELD', field: 'color', value: catalogueItem.colorOptions?.includes('color') ? 'color' : 'bw' });
    dispatch({ type: 'UPDATE_FIELD', field: 'paperSize', value: catalogueItem.paperSizes?.[0] || 'A4' });
    dispatch({ type: 'UPDATE_FIELD', field: 'binding', value: catalogueItem.bindingOptions?.[0] || 'none' });
    toast.success(`${catalogueItem.name} loaded`, { duration: 2000 });
  }, [catalogueItem]);

  const basePrice = catalogueItem?.price ?? 0.50;
  const pages = parseInt(formData.pages) || 1;
  const copies = parseInt(formData.copies) || 1;
  const distanceKm = Math.max(0, parseFloat(formData.distanceKm) || 0);

  // Binding fee logic (pages > 5)
  const bindingFee = useMemo(() => {
    if (pages <= 5 || formData.binding === 'none') return 0;
    const b = formData.binding.toLowerCase();
    if (b === 'spiral') return 5.00;
    if (b === 'hardcover') return 15.00;
    if (b === 'softcover') return 10.00;
    if (b === 'staple') return 1.50;
    return 0;
  }, [pages, formData.binding]);

  // Thesis Gold Embossing Premium
  const goldEmbossingFee = useMemo(() => {
    return formData.isThesis && formData.goldEmbossing ? 15.00 : 0;
  }, [formData.isThesis, formData.goldEmbossing]);

  const coverPageEligible = formData.printType === 'book' || catalogueItem?.id === 'thesis' || /book|thesis/i.test(catalogueItem?.name || '');
  const coverPageCharge = coverPageEligible && formData.includeCoverPage ? 5 : 0;

  // Subtotal including base, binding, cover page, and thesis embossing
  const subtotal = useMemo(
    () => Number((basePrice * pages * copies + coverPageCharge + bindingFee + goldEmbossingFee).toFixed(2)),
    [basePrice, pages, copies, coverPageCharge, bindingFee, goldEmbossingFee]
  );

  const deliveryEligible = subtotal >= 50 && distanceKm > 0 && distanceKm <= 10;
  const deliveryCharge = deliveryEligible && formData.deliverySelected ? 8 : 0;
  const totalPrice = useMemo(
    () => (subtotal + deliveryCharge).toFixed(2),
    [subtotal, deliveryCharge]
  );

  // ── Checkout step (drives ProgressSteps) ──
  const currentStep = useMemo(() => {
    if (showPayment || pendingJobId || orderSuccess) return 2;
    if (file) return 1;
    return 0;
  }, [file, showPayment, pendingJobId, orderSuccess]);

  const handleFileChosen = useCallback((fileList) => {
    const raw = fileList[0];
    if (!raw) return;

    // Check extension
    const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png', 'doc', 'docx'];
    const fileExt = raw.name.split('.').pop().toLowerCase();

    // Check MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const isAllowedType = allowedMimeTypes.includes(raw.type) || allowedExtensions.includes(fileExt);

    if (!isAllowedType) {
      toast.error('Unsupported file format. Please upload PDF, DOC, DOCX, JPEG, or PNG files only.');
      return;
    }

    if (raw.size > 100 * 1024 * 1024) {
      toast.error('File size exceeds the 100MB limit. Please compress your document or split the file.');
      return;
    }

    setFile(raw);
    toast.success(`${raw.name} ready`);
  }, []);

  const handleUploadClick = useCallback(() => {
    if (submitLoading || !fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }, [submitLoading]);

  const removeFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (!deliveryEligible && formData.deliverySelected) {
      updateFormField('deliverySelected', false);
    }
  }, [deliveryEligible, formData.deliverySelected, updateFormField]);

  // Step 1: Create order in Firestore (status=pending, paymentStatus=unpaid)
  const handleCreateOrder = useCallback(async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    if (!user) { toast.error('Please login'); navigate('/customer/login'); return; }
    if (formData.deliverySelected && (!formData.deliveryName.trim() || !formData.deliveryPhone.trim() || !formData.deliveryAddress.trim())) {
      toast.error('Please complete delivery details');
      return;
    }

    setSubmitLoading(true);
    const toastId = toast.loading('Preparing order…');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const filePreview = file.size < 800000 ? reader.result : null;
          const jobData = {
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            filePreview,
            pages: parseInt(formData.pages) || 1,
            copies: parseInt(formData.copies) || 1,
            color: formData.color,
            binding: formData.binding,
            bindingFee,
            isThesis: formData.isThesis,
            goldEmbossing: formData.isThesis && formData.goldEmbossing,
            goldEmbossingFee,
            paperSize: formData.paperSize,
            printType: formData.printType,
            includeCoverPage: coverPageEligible && formData.includeCoverPage,
            coverPage: coverPageEligible && formData.includeCoverPage ? {
              title: formData.coverTitle || catalogueItem?.name || 'Print Order',
              subtitle: formData.coverSubtitle || '',
              color: formData.coverColor,
              charge: coverPageCharge,
            } : null,
            subtotal,
            deliverySelected: formData.deliverySelected,
            deliveryEligible,
            deliveryDistanceKm: distanceKm,
            deliveryCharge,
            deliveryDetails: formData.deliverySelected ? {
              name: formData.deliveryName.trim(),
              phone: formData.deliveryPhone.trim(),
              address: formData.deliveryAddress.trim(),
            } : null,
            notes: formData.notes || '',
            price: parseFloat(totalPrice),
            catalogueItem: catalogueItem?.name || 'Custom Order',
            catalogueItemId: catalogueItem?.id,
            cataloguePricePerPage: basePrice,
            customerId: user.uid,
            customerName: user.profile?.name || user.displayName || user.email?.split('@')[0] || 'Customer',
            customerEmail: user.email || '',
            status: 'pending',
            paymentStatus: 'unpaid',
            readByCustomer: true,
            readByAdmin: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const jobRef = await addDoc(collection(db, 'printJobs'), jobData);

          // Notify admin immediately when a new order is created and pending
          try {
            await addDoc(collection(db, 'adminNotifications'), {
              type: 'new_order',
              jobId: jobRef.id,
              customerId: user.uid,
              customerName: user.profile?.name || user.displayName || user.email?.split('@')[0] || 'Customer',
              customerEmail: user.email || '',
              catalogueItem: catalogueItem?.name || 'Custom Order',
              amount: parseFloat(totalPrice),
              status: 'pending',
              paymentStatus: 'unpaid',
              read: false,
              createdAt: serverTimestamp(),
            });
          } catch (notifErr) {
            console.error('Admin notification failed:', notifErr);
          }

          toast.dismiss(toastId);
          setPendingJobId(jobRef.id);
          setShowPayment(true);
        } catch (err) {
          toast.error(`Failed: ${err.message}`, { id: toastId });
        } finally {
          setSubmitLoading(false);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file', { id: toastId });
        setSubmitLoading(false);
      };
    } catch (err) {
      toast.error(err.message, { id: toastId });
      setSubmitLoading(false);
    }
  }, [file, user, navigate, formData, totalPrice, catalogueItem, basePrice, coverPageEligible, coverPageCharge, subtotal, deliveryEligible, distanceKm, deliveryCharge, bindingFee, goldEmbossingFee]);

  // Cleanup order on timeout
  const handlePaymentTimeout = useCallback(async () => {
    if (!pendingJobId) return;
    setShowPayment(false);

    const toastId = toast.loading('Payment timed out. Cleaning up order queue…');
    try {
      const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await deleteDoc(firestoreDoc(db, 'printJobs', pendingJobId));

      const { query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'adminNotifications'), where('jobId', '==', pendingJobId));
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      querySnapshot.forEach((d) => {
        deletePromises.push(deleteDoc(firestoreDoc(db, 'adminNotifications', d.id)));
      });
      await Promise.all(deletePromises);

      toast.error('Transaction timed out for security reasons. Please re-verify your print order details.', {
        id: toastId,
        duration: 8000,
      });
    } catch (err) {
      console.error('Timeout cleanup error:', err);
      toast.dismiss(toastId);
      toast.error('Transaction timed out for security reasons. Please re-verify your print order details.', {
        duration: 8000,
      });
    } finally {
      setPendingJobId(null);
    }
  }, [pendingJobId]);

  // Step 2: Payment success → update job + notify admin
  const handlePaymentSuccess = useCallback(async ({ method, provider, paymentToken, last4 }) => {
    setShowPayment(false);
    const toastId = toast.loading('Confirming payment…');

    try {
      // Update print job
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'printJobs', pendingJobId), {
        paymentStatus: 'paid',
        paymentMethod: method,
        paymentProvider: provider,
        paymentToken,
        paymentLast4: last4,
        status: 'pending',
        updatedAt: serverTimestamp(),
      });

      // Notify admin — create entry in adminNotifications collection
      await addDoc(collection(db, 'adminNotifications'), {
        type: 'new_order',
        jobId: pendingJobId,
        customerId: user.uid,
        customerName: user.profile?.name || user.displayName || user.email?.split('@')[0],
        customerEmail: user.email,
        catalogueItem: catalogueItem?.name || 'Custom Order',
        amount: parseFloat(totalPrice),
        paymentMethod: method,
        paymentProvider: provider,
        paymentToken,
        paymentStatus: 'paid',
        status: 'pending',
        read: false,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'adminNotifications'), {
        type: 'payment_successful',
        auditType: 'payment',
        jobId: pendingJobId,
        customerId: user.uid,
        customerName: user.profile?.name || user.displayName || user.email?.split('@')[0],
        customerEmail: user.email,
        catalogueItem: catalogueItem?.name || 'Custom Order',
        amount: parseFloat(totalPrice),
        paymentMethod: method,
        paymentProvider: provider,
        paymentToken,
        status: 'paid',
        read: false,
        createdAt: serverTimestamp(),
      });

      toast.success(`🎉 Order confirmed! #${pendingJobId.slice(-6).toUpperCase()}`, {
        id: toastId,
        duration: 5000,
      });

      setSuccessfulPaymentToken(paymentToken);
      setOrderSuccess(true);
      setTimeout(() => {
        navigate('/customer/dashboard', {
          state: { newOrderId: pendingJobId, flash: true },
          replace: true,
        });
      }, 2000);
    } catch (err) {
      toast.error(`Payment recorded but update failed: ${err.message}`, { id: toastId });
    }
  }, [pendingJobId, user, catalogueItem, totalPrice, navigate]);

  // ── Loading
  if (contextLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: cream }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-4 mx-auto mb-6"
            style={{ borderColor: `${gold} transparent ${gold} transparent` }}
          />
          <p className="font-black text-xl" style={{ color: ink }}>Loading…</p>
        </div>
      </div>
    );
  }

  // ── Success screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: cream }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: 2, duration: 0.4 }}
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ background: '#DCFCE7' }}
          >
            <CheckCircle2 size={48} style={{ color: '#047857' }} />
          </motion.div>
          <h1 className="text-4xl font-black mb-3" style={{ color: ink }}>Order Confirmed!</h1>
          {successfulPaymentToken && (
            <p className="text-sm font-black mb-3 px-4 py-2 rounded-xl inline-block" style={{ color: '#065F46', background: '#DCFCE7' }}>
              Payment token: {successfulPaymentToken}
            </p>
          )}
          <p className="text-lg font-semibold" style={{ color: slate }}>Redirecting to dashboard…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Payment Gateway Overlay */}
      <AnimatePresence>
        {showPayment && (
          <PaymentGateway
            totalPrice={totalPrice}
            onSuccess={handlePaymentSuccess}
            onTimeout={handlePaymentTimeout}
            onCancel={async () => {
              setShowPayment(false);
              if (pendingJobId) {
                const toastId = toast.loading('Saving order draft…');
                try {
                  const { updateDoc, deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');

                  // Save as Draft
                  await updateDoc(firestoreDoc(db, 'printJobs', pendingJobId), {
                    status: 'draft',
                    paymentStatus: 'unpaid',
                    updatedAt: serverTimestamp()
                  });

                  const { query, where, getDocs } = await import('firebase/firestore');
                  const q = query(collection(db, 'adminNotifications'), where('jobId', '==', pendingJobId));
                  const querySnapshot = await getDocs(q);
                  const deletePromises = [];
                  querySnapshot.forEach((d) => {
                    deletePromises.push(deleteDoc(firestoreDoc(db, 'adminNotifications', d.id)));
                  });
                  await Promise.all(deletePromises);

                  toast.success('Order saved to Drafts', { id: toastId });
                } catch (err) {
                  toast.error(`Error: ${err.message}`, { id: toastId });
                }
                setPendingJobId(null);
              }
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ padding: '0px 0 80px' }}>
        {/* ── TOP BAR */}
        <div className="sticky top-0 z-20 border-b rounded-3xl mb-6 shadow-sm" style={{ background: cream, borderColor: '#DBEAFE' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <motion.button
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/customer/dashboard/catalogue')}
              className="flex items-center gap-2 font-bold text-sm"
              style={{ color: ink }}
            >
              <ChevronLeft size={20} />
              Back to Catalogue
            </motion.button>

            {catalogueItem && (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm hidden sm:block" style={{ color: ink }}>
                  {catalogueItem.name}
                </span>
                <div
                  className="px-3 py-1 rounded-full text-xs font-black"
                  style={{ background: gold, color: 'white' }}
                >
                  RM {basePrice.toFixed(2)}/page
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
          {/* ── HERO */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {catalogueItem && (
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                  style={{ background: '#D1FAE5', color: '#065F46' }}
                >
                  {catalogueItem.category}
                </span>
                {catalogueItem.premium && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1"
                    style={{ background: gold, color: 'white' }}
                  >
                    <Star size={12} fill="currentColor" /> Premium
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: slate }}>
                  <Clock size={14} />
                  {catalogueItem.estimatedTurnaround}
                </span>
              </div>
            )}

            <h1
              className="text-5xl lg:text-6xl font-black mb-3 leading-none tracking-tight"
              style={{ color: ink }}
            >
              {catalogueItem?.name || 'Print Order'}
            </h1>
            {catalogueItem && (
              <p className="text-lg font-medium max-w-2xl" style={{ color: slate }}>
                {catalogueItem.description}
              </p>
            )}
          </motion.div>

          {/* ── PROGRESS STEPS */}
          <ProgressSteps current={currentStep} />

          {/* ── GRID */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* LEFT: Upload */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpeg,.jpg,.png,.doc,.docx"
                className="sr-only"
                onChange={(e) => handleFileChosen(e.target.files)}
                disabled={submitLoading}
              />

              <h2 className="text-2xl font-black mb-6 flex items-center gap-3" style={{ color: ink }}>
                <Upload size={24} style={{ color: gold }} />
                Upload File
              </h2>

              {/* Drop Zone */}
              <motion.div
                role="button"
                tabIndex={0}
                onClick={handleUploadClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleUploadClick(); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileChosen(Array.from(e.dataTransfer.files));
                }}
                animate={{ scale: dragOver ? 1.02 : 1 }}
                className="relative rounded-3xl border-2 border-dashed min-h-[280px] flex flex-col items-center justify-center p-10 cursor-pointer transition-all duration-300 overflow-hidden"
                style={{
                  borderColor: file ? gold : dragOver ? gold : '#D1D5DB',
                  background: file ? '#FFFBF5' : dragOver ? '#FFFBF5' : 'white',
                }}
              >
                {/* Corner accents */}
                {['-top-3 -left-3', '-top-3 -right-3', '-bottom-3 -left-3', '-bottom-3 -right-3'].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute ${pos} w-6 h-6 rounded-full transition-all`}
                    style={{ background: file || dragOver ? gold : '#E5E7EB' }}
                  />
                ))}

                <div className="text-center space-y-4">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                    style={{ background: file ? gold : dragOver ? gold : ink }}
                  >
                    {file ? (
                      <CheckCircle2 size={36} color="white" />
                    ) : (
                      <Upload size={36} style={{ color: file ? ink : gold }} />
                    )}
                  </div>

                  <div>
                    <p className="text-xl font-black truncate max-w-xs mx-auto" style={{ color: ink }}>
                      {file ? file.name : 'Drop your file here'}
                    </p>
                    <p className="text-sm font-semibold mt-1" style={{ color: slate }}>
                      {file
                        ? `${(file.size / 1024 / 1024).toFixed(1)} MB • Ready`
                        : 'PDF, DOC, DOCX, JPEG, PNG — max 100 MB'}
                    </p>
                  </div>

                  {!file && (
                    <span
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                      style={{ background: '#DBEAFE', color: '#0F172A' }}
                    >
                      Browse Files
                    </span>
                  )}
                </div>
              </motion.div>

              {/* File info strip */}
              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl border"
                    style={{ background: '#EDE9FE', borderColor: '#DDD6FE' }}
                  >
                    <File size={20} style={{ color: '#7C3AED' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: ink }}>{file.name}</p>
                      <p className="text-xs" style={{ color: slate }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      onClick={removeFile}
                      className="p-2 rounded-xl hover:bg-red-100 transition-colors"
                      style={{ color: '#DC2626' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Features */}
              {catalogueItem && (
                <div
                  className="mt-6 rounded-2xl p-5 border shadow-sm"
                  style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}
                >
                  <h3 className="font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: gold }}>
                    <Sparkles size={16} />
                    What's Included
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {catalogueItem.features?.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-semibold" style={{ color: ink }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: gold }} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* RIGHT: Options + Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Quantity row */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'white', borderColor: '#E5E7EB' }}
              >
                <h3 className="font-black text-sm uppercase tracking-wider mb-5" style={{ color: ink }}>
                  Quantity
                </h3>
                <div className="space-y-4">
                  <CounterInput
                    label="Copies"
                    value={formData.copies}
                    onChange={(v) => updateFormField('copies', v)}
                    min={1}
                    max={100}
                  />
                </div>
              </div>

              {/* Print options */}
              {catalogueItem && (
                <div
                  className="rounded-2xl p-6 border"
                  style={{ background: 'white', borderColor: '#E5E7EB' }}
                >
                  <h3 className="font-black text-sm uppercase tracking-wider mb-5" style={{ color: ink }}>
                    Print Options
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {catalogueItem.colorOptions?.length > 1 && (
                      <SelectField
                        label="Color"
                        value={formData.color}
                        onChange={(v) => updateFormField('color', v)}
                        options={[
                          { value: 'bw', label: 'Black & White' },
                          { value: 'color', label: 'Full Color' },
                        ]}
                        gold={gold}
                      />
                    )}
                    {catalogueItem.paperSizes?.length > 1 && (
                      <SelectField
                        label="Paper Size"
                        value={formData.paperSize}
                        onChange={(v) => updateFormField('paperSize', v)}
                        options={catalogueItem.paperSizes.map((s) => ({ value: s, label: s }))}
                        gold={gold}
                      />
                    )}
                    {catalogueItem.printTypes?.length > 1 && (
                      <SelectField
                        label="Print Type"
                        value={formData.printType}
                        onChange={(v) => updateFormField('printType', v)}
                        options={[
                          { value: 'document', label: 'Document' },
                          { value: 'photo', label: 'Photo' },
                          { value: 'book', label: 'Book' },
                        ]}
                        gold={gold}
                      />
                    )}
                    {catalogueItem.bindingOptions?.length > 1 && (
                      <SelectField
                        label="Binding"
                        value={formData.binding}
                        onChange={(v) => updateFormField('binding', v)}
                        disabled={formData.pages <= 5}
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'staple', label: 'Staple' },
                          { value: 'spiral', label: 'Spiral' },
                          { value: 'hardcover', label: 'Hardcover' },
                          { value: 'softcover', label: 'Softcover' },
                        ]}
                        gold={gold}
                      />
                    )}
                  </div>
                  {formData.pages <= 5 && catalogueItem.bindingOptions?.length > 1 && (
                    <p className="mt-3 text-xs font-semibold flex items-center gap-1.5" style={{ color: slate }}>
                      <AlertTriangle size={12} />
                      Binding unlocks for documents over 5 pages
                    </p>
                  )}
                </div>
              )}

              {/* Thesis options */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'white', borderColor: '#E5E7EB' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: ink }}>
                      Academic Thesis
                    </h3>
                    <p className="text-xs font-semibold mt-1" style={{ color: slate }}>
                      Toggle to enable thesis-specific premium options
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.isThesis}
                    label="Academic Thesis mode"
                    onChange={(newIsThesis) => {
                      updateFormField('isThesis', newIsThesis);
                      if (!newIsThesis) {
                        updateFormField('goldEmbossing', false);
                      }
                    }}
                  />
                </div>

                <AnimatePresence>
                  {formData.isThesis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-dashed border-slate-200 overflow-hidden"
                    >
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-sm font-semibold" style={{ color: ink }}>
                          Premium Gold-Embossing{' '}
                          <span className="font-bold" style={{ color: gold }}>(+ RM 15.00)</span>
                        </span>
                        <ToggleSwitch
                          checked={formData.goldEmbossing}
                          label="Premium Gold-Embossing"
                          onChange={(v) => updateFormField('goldEmbossing', v)}
                        />
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Cover page options */}
              {coverPageEligible && (
                <div
                  className="rounded-2xl p-6 border"
                  style={{ background: 'white', borderColor: '#E5E7EB' }}
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: ink }}>
                        Cover Page
                      </h3>
                      <p className="text-xs font-semibold mt-1" style={{ color: slate }}>
                        Available for book or thesis-style orders{' '}
                        <span className="font-bold" style={{ color: gold }}>(+ RM 5.00)</span>
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={formData.includeCoverPage}
                      label="Include cover page"
                      onChange={(v) => updateFormField('includeCoverPage', v)}
                    />
                  </div>

                  <AnimatePresence>
                    {formData.includeCoverPage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-4 overflow-hidden"
                      >
                        <input
                          value={formData.coverTitle}
                          onChange={(e) => updateFormField('coverTitle', e.target.value)}
                          placeholder="Cover title"
                          className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold focus:outline-none"
                          style={{ borderColor: '#E5E7EB', color: ink, background: '#FAFAFA' }}
                          onFocus={(e) => (e.target.style.borderColor = gold)}
                          onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                        />
                        <input
                          value={formData.coverSubtitle}
                          onChange={(e) => updateFormField('coverSubtitle', e.target.value)}
                          placeholder="Subtitle or author name"
                          className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold focus:outline-none"
                          style={{ borderColor: '#E5E7EB', color: ink, background: '#FAFAFA' }}
                          onFocus={(e) => (e.target.style.borderColor = gold)}
                          onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                        />
                        <SelectField
                          label="Cover Color"
                          value={formData.coverColor}
                          onChange={(v) => updateFormField('coverColor', v)}
                          options={[
                            { value: 'bw', label: 'Black & White' },
                            { value: 'color', label: 'Full Color' },
                          ]}
                          gold={gold}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Delivery option */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'white', borderColor: '#E5E7EB' }}
              >
                <h3 className="font-black text-sm uppercase tracking-wider mb-4" style={{ color: ink }}>
                  Delivery
                </h3>
                <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: slate }}>
                      Distance from shop (km)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={formData.distanceKm}
                      onChange={(e) => updateFormField('distanceKm', Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold focus:outline-none"
                      style={{ borderColor: '#E5E7EB', color: ink, background: '#FAFAFA' }}
                      onFocus={(e) => (e.target.style.borderColor = gold)}
                      onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}>
                    <span className="text-xs font-black" style={{ color: formData.deliverySelected ? '#166534' : slate }}>
                      {formData.deliverySelected ? 'Delivery On' : 'Use Delivery'}
                    </span>
                    <ToggleSwitch
                      checked={formData.deliverySelected}
                      label="Use delivery service"
                      onChange={(v) => updateFormField('deliverySelected', v)}
                    />
                  </div>
                </div>

                {!deliveryEligible && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5" style={{ color: '#B45309' }}>
                      <span>RM {subtotal.toFixed(2)} / RM 50.00 minimum</span>
                      <span>{Math.min(100, Math.round((subtotal / 50) * 100))}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#FEF3C7' }}>
                      <motion.div
                        initial={false}
                        animate={{ width: `${Math.min(100, (subtotal / 50) * 100)}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full rounded-full"
                        style={{ background: '#F59E0B' }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 text-xs font-bold flex items-center gap-1.5" style={{ color: deliveryEligible ? '#166534' : '#B45309' }}>
                  {deliveryEligible ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  {deliveryEligible
                    ? 'Eligible: subtotal is at least RM 50.00 and distance is within 10km.'
                    : 'Delivery unlocks when subtotal is at least RM 50.00 and distance is within 10km.'}
                </div>

                <AnimatePresence>
                  {formData.deliverySelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid gap-3 mt-5 overflow-hidden"
                    >
                      <input
                        value={formData.deliveryName}
                        onChange={(e) => updateFormField('deliveryName', e.target.value)}
                        placeholder="Recipient name"
                        className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold focus:outline-none"
                        style={{ borderColor: '#E5E7EB', color: ink, background: '#FAFAFA' }}
                        onFocus={(e) => (e.target.style.borderColor = gold)}
                        onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                      />
                      <input
                        value={formData.deliveryPhone}
                        onChange={(e) => updateFormField('deliveryPhone', e.target.value)}
                        placeholder="Recipient phone"
                        className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold focus:outline-none"
                        style={{ borderColor: '#E5E7EB', color: ink, background: '#FAFAFA' }}
                        onFocus={(e) => (e.target.style.borderColor = gold)}
                        onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                      />
                      <textarea
                        value={formData.deliveryAddress}
                        onChange={(e) => updateFormField('deliveryAddress', e.target.value)}
                        placeholder="Delivery address"
                        rows={2}
                        className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold resize-none focus:outline-none"
                        style={{ borderColor: '#E5E7EB', color: ink, background: '#FAFAFA' }}
                        onFocus={(e) => (e.target.style.borderColor = gold)}
                        onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notes */}
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'white', borderColor: '#E5E7EB' }}
              >
                <label className="block font-black text-sm uppercase tracking-wider mb-3" style={{ color: ink }}>
                  Special Instructions
                  <span className="ml-2 font-semibold normal-case tracking-normal" style={{ color: slate }}>
                    (optional)
                  </span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateFormField('notes', e.target.value)}
                  placeholder="e.g. Double-sided, staple top-left, urgent by tomorrow…"
                  rows={3}
                  className="w-full px-4 py-3 border-2 rounded-xl text-sm font-medium resize-none focus:outline-none transition-all"
                  style={{ borderColor: '#E5E7EB', color: ink, background: '#FAFAFA' }}
                  onFocus={(e) => (e.target.style.borderColor = gold)}
                  onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              {/* Price Summary */}
              <motion.div
                key={totalPrice}
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                className="rounded-2xl p-6 shadow-lg lg:sticky lg:top-24"
                style={{ background: 'white' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-sm uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                    Order Summary
                  </span>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: gold }} />
                </div>

                <div className="space-y-2 mb-5">
                  {[
                    [`${formData.pages} pg × ${formData.copies} • RM ${basePrice.toFixed(2)}/pg`, `RM ${(basePrice * pages * copies).toFixed(2)}`],
                    ...(coverPageCharge > 0 ? [['Cover page', `RM ${coverPageCharge.toFixed(2)}`]] : []),
                    ...(bindingFee > 0 ? [[`Binding (${formData.binding})`, `RM ${bindingFee.toFixed(2)}`]] : []),
                    ...(goldEmbossingFee > 0 ? [['Thesis Gold-Embossing', `RM ${goldEmbossingFee.toFixed(2)}`]] : []),
                    ...(deliveryCharge > 0 ? [['Delivery service', `RM ${deliveryCharge.toFixed(2)}`]] : []),
                  ].map(([k, v], i) => (
                    <div key={i} className="flex justify-between text-sm font-medium" style={{ color: '#6B7280' }}>
                      <span>{k}</span>
                      {v && <span>{v}</span>}
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-black pt-2" style={{ color: ink }}>
                    <span>Digital quotation</span>
                    <span>RM {subtotal.toFixed(2)} subtotal</span>
                  </div>
                  <div className="border-t pt-3 mt-3" style={{ borderColor: '#E2E8F0' }}>
                    <div className="flex justify-between items-baseline">
                      <span className="font-black text-sm uppercase tracking-wider" style={{ color: '#64748B' }}>
                        Total
                      </span>
                      <span className="font-black text-4xl" style={{ color: gold }}>
                        RM {totalPrice}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                {!submitLoading ? (
                  <motion.button
                    whileHover={file && user ? { scale: 1.02 } : {}}
                    whileTap={file && user ? { scale: 0.98 } : {}}
                    onClick={handleCreateOrder}
                    disabled={!file || !user}
                    className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-md"
                    style={{
                      background: file && user ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#E2E8F0',
                      color: file && user ? 'white' : '#94A3B8',
                      cursor: file && user ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <CreditCard size={22} />
                    Proceed to Payment
                  </motion.button>
                ) : (
                  <div className="w-full py-4 rounded-2xl flex items-center justify-center gap-3" style={{ background: '#DBEAFE' }}>
                    <Loader2 size={20} className="animate-spin" style={{ color: gold }} />
                    <span className="font-bold" style={{ color: '#0F172A' }}>Creating order…</span>
                  </div>
                )}

                {!user && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: '#EF4444' }}>
                    <AlertTriangle size={14} />
                    Login required to place orders
                  </div>
                )}
                {!file && user && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: '#9CA3AF' }}>
                    <Package size={14} />
                    Upload a file to continue
                  </div>
                )}
              </motion.div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 py-2">
                {[
                  { Icon: Shield, label: 'SSL Secured' },
                  { Icon: Lock, label: 'Encrypted' },
                  { Icon: CheckCircle, label: 'Verified' },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: slate }}>
                    <Icon size={14} style={{ color: gold }} />
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

// ──────────────────────────────────────────────────────────────────
// SELECT FIELD
// ──────────────────────────────────────────────────────────────────
const SelectField = React.memo(({ label, value, onChange, options, gold, disabled }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: slate }}>
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-3 pr-8 border-2 rounded-xl text-sm font-semibold appearance-none focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: '#E5E7EB', color: ink, background: disabled ? '#F3F4F6' : 'white' }}
        onFocus={(e) => !disabled && (e.target.style.borderColor = gold)}
        onBlur={(e) => !disabled && (e.target.style.borderColor = '#E5E7EB')}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: slate }} />
    </div>
  </div>
));

export default PrintOrderPage;