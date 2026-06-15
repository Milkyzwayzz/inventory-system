// src/pages/CataloguePage.jsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Search, Star, Zap, Package, Grid3x3, List, Eye,
  SlidersHorizontal, X, ArrowUpDown, Clock, Sparkles
} from 'lucide-react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';

// ── FALLBACK CATALOGUE DATA ────────────────────────────────────
const FALLBACK_ITEMS = [
  {
    id: 'a4-bw',
    name: 'Standard A4 B&W',
    category: 'Documents',
    price: 0.15,
    description: 'Quality 80gsm paper, ideal for assignments and notes.',
    features: ['80gsm Bond', 'Sharp Text', 'Fast-dry'],
    tag: 'Essential',
    image: 'https://mprinting.ca/wp-content/uploads/2024/09/document_printing_bw_legal-jpg.webp',
    premium: false,
    printTypes: ['document'],
    colorOptions: ['bw'],
    paperSizes: ['A4'],
    bindingOptions: ['none', 'staple'],
    estimatedTurnaround: '24 hours'
  },
  {
    id: 'a4-color',
    name: 'Premium A4 Color',
    category: 'Documents',
    price: 0.80,
    description: 'Vibrant CMYK output for presentations and reports.',
    features: ['Full Color', 'High Saturation', 'Smudge-proof'],
    tag: 'Popular',
    image: 'https://www.tpp.sg/files/subscribers/470cf6b2-e07b-45f1-a6c5-fb2b2f1a8184/sites/71224c4d-448d-4d3b-9237-f97bc6219285/products/26a8feae-9d0c-4f35-9221-0a2d59733bd6/DocumentPrinting(Color)_xlarge.png?stamp=636361380711951241',
    premium: false,
    printTypes: ['document', 'photo'],
    colorOptions: ['color'],
    paperSizes: ['A4'],
    bindingOptions: ['none', 'staple'],
    estimatedTurnaround: '24 hours'
  },
  {
    id: 'thesis',
    name: 'Thesis / Book Printing',
    category: 'Academic',
    price: 0.25,
    description: 'Professional binding options for long documents.',
    features: ['Spiral/Hardcover', 'Index Tabs', 'Double Sided'],
    tag: 'Bestseller',
    image: 'https://theprintshop.co.za/wp-content/uploads/2024/04/326-3265737_order-online-book-bind-thesis.jpg',
    premium: true,
    printTypes: ['book', 'document'],
    colorOptions: ['bw', 'color'],
    paperSizes: ['A4'],
    bindingOptions: ['spiral', 'hardcover', 'softcover'],
    estimatedTurnaround: '2-3 days'
  },
  {
    id: 'poster',
    name: 'A3 Poster Printing',
    category: 'Large Format',
    price: 2.50,
    description: 'Large-scale posters on glossy or matte stock.',
    features: ['UV Resistant', 'Glossy Finish', 'Wide Format'],
    tag: 'High Impact',
    image: 'https://nonwovenbagmalaysia.com.my/wp-content/uploads/2023/09/poster-printing-shop-near-me.jpg',
    premium: false,
    printTypes: ['photo', 'document'],
    colorOptions: ['color'],
    paperSizes: ['A3'],
    bindingOptions: ['none'],
    estimatedTurnaround: '1-2 days'
  },
  {
    id: 'brochure',
    name: 'Tri-fold Brochure',
    category: 'Marketing',
    price: 1.50,
    description: 'High-impact brochures on premium silk card stock.',
    features: ['Folding Included', '150gsm Silk', 'Full Bleed'],
    tag: 'Marketing',
    image: 'https://marketplace.canva.com/EAGsD2vrJ7U/1/0/1600w/canva-blue-tropical-travel-agency-brochure-XrU51JRAhw8.jpg',
    premium: false,
    printTypes: ['document', 'photo'],
    colorOptions: ['color'],
    paperSizes: ['A4'],
    bindingOptions: ['fold'],
    estimatedTurnaround: '2-3 days'
  },
  {
    id: 'flyer',
    name: 'Business Flyers',
    category: 'Marketing',
    price: 0.60,
    description: 'Cost-effective handouts for local promotion.',
    features: ['Bulk Discounts', 'Vibrant Gloss', 'A5/A6'],
    tag: 'Deal',
    image: 'https://img.freepik.com/free-vector/corporate-business-flyer-template_52683-54512.jpg?w=740&q=80',
    premium: false,
    printTypes: ['photo', 'document'],
    colorOptions: ['color'],
    paperSizes: ['A5', 'A6'],
    bindingOptions: ['none'],
    estimatedTurnaround: '24 hours'
  },
  {
    id: 'business-cards',
    name: 'Premium Business Cards',
    category: 'Marketing',
    price: 0.05,
    description: '350gsm cards with spot UV or foil stamping.',
    features: ['350gsm Silk', 'Spot UV', 'Foil Stamping'],
    tag: 'Premium',
    image: 'https://i.ebayimg.com/images/g/nk8AAOSwAuNW5GrP/s-l1200.jpg',
    premium: true,
    printTypes: ['photo', 'document'],
    colorOptions: ['color'],
    paperSizes: ['A6'],
    bindingOptions: ['none'],
    estimatedTurnaround: '3-5 days'
  },
  {
    id: 'banners',
    name: 'Vinyl Outdoor Banners',
    category: 'Large Format',
    price: 8.00,
    description: 'Weatherproof vinyl banners for events and signage.',
    features: ['Outdoor Durable', 'Grommets', 'Double Stitched'],
    tag: 'Event',
    image: 'https://s1-ecp.signs.com/5559/583x357/Vinyl_Banner.jpg',
    premium: false,
    printTypes: ['photo', 'document'],
    colorOptions: ['color'],
    paperSizes: ['A3'],
    bindingOptions: ['none'],
    estimatedTurnaround: '2-3 days'
  },
];

const CATEGORIES = ['All', 'Documents', 'Academic', 'Marketing', 'Large Format'];

const SORT_OPTIONS = [
  { value: 'default', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'fastest', label: 'Fastest Turnaround' },
];

const CATEGORY_COLORS = {
  Documents: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', solid: 'bg-blue-600' },
  Academic: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', solid: 'bg-purple-600' },
  Marketing: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', solid: 'bg-indigo-600' },
  'Large Format': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', solid: 'bg-amber-600' },
};

// Parse turnaround strings like "24 hours", "1-2 days", "3-5 days" into a sortable number (hours)
const turnaroundToHours = (str = '') => {
  const s = str.toLowerCase();
  const nums = (s.match(/\d+/g) || ['0']).map(Number);
  const min = nums[0] ?? 0;
  if (s.includes('hour')) return min;
  if (s.includes('day')) return min * 24;
  return min;
};

// ── CATALOGUE CARD COMPONENT ─────────────────────────────────
const CatalogueCard = ({ item, onQuickOrder, viewMode }) => {
  const [imgErr, setImgErr] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Documents;
  const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
  const features = Array.isArray(item.features) ? item.features : [];

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="group relative bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-300 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 flex flex-col sm:flex-row"
      >
        {/* Image */}
        <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 bg-slate-100">
          {!imgLoaded && !imgErr && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}
          {item.image && !imgErr ? (
            <img
              src={item.image}
              alt={item.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200">
              <Package size={32} className="text-slate-400" />
            </div>
          )}
          {item.premium && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
              <Star size={9} fill="currentColor" /> Premium
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {item.category}
              </span>
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                {item.tag || item.category}
              </span>
            </div>
            <h3 className="font-black text-slate-900 text-base leading-tight mb-1 group-hover:text-indigo-900 transition-colors">
              {item.name}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-1 mb-2">
              {item.description}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {features.slice(0, 3).map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded tracking-wide"
                >
                  {f}
                </span>
              ))}
              {item.estimatedTurnaround && (
                <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <Clock size={12} /> {item.estimatedTurnaround}
                </span>
              )}
            </div>
          </div>

          {/* Price & Action */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 sm:text-right sm:border-l sm:border-slate-100 sm:pl-5 sm:min-w-[140px]">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From</p>
              <p className="text-xl font-black text-indigo-600 leading-none">
                RM {price.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400">per page</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onQuickOrder(item)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/30 transition-colors whitespace-nowrap"
            >
              <Zap size={13} />
              Order
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="group relative bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-300 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-100/60 transition-all duration-300 flex flex-col h-full"
    >
      {/* Premium Badge */}
      {item.premium && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
          <Star size={10} fill="currentColor" /> Premium
        </div>
      )}

      {/* Category Tag */}
      <div className="absolute top-3 right-3 z-20">
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border} backdrop-blur-sm`}>
          {item.tag || item.category}
        </span>
      </div>

      {/* Image Section */}
      <div className="relative h-48 overflow-hidden bg-slate-100 flex-shrink-0">
        {!imgLoaded && !imgErr && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse" />
        )}
        {item.image && !imgErr ? (
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200">
            <Package size={40} className="text-slate-400" />
            <p className="text-xs text-slate-400 font-bold uppercase">{item.category}</p>
          </div>
        )}
        {/* Gradient overlay on hover for readability of quick-view */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
          <span className="flex items-center gap-1.5 text-white text-[11px] font-bold uppercase tracking-wider translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <Eye size={13} /> Quick view
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Category Chip */}
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${catColor.dot}`} />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {item.category}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-indigo-900 transition-colors line-clamp-2">
          {item.name}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">
          {item.description}
        </p>

        {/* Features */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {features.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded tracking-wide"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Turnaround Time */}
        {item.estimatedTurnaround && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Clock size={13} className="text-slate-400" />
            {item.estimatedTurnaround}
          </div>
        )}

        {/* Price & Button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From</p>
            <p className="text-2xl font-black text-indigo-600 leading-none">
              RM {price.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400">per page</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onQuickOrder(item)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/30 transition-colors"
          >
            <Zap size={13} />
            Order Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ── SKELETON CARD ──────────────────────────────────────────────
const SkeletonCard = ({ viewMode }) => {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden animate-pulse flex flex-col sm:flex-row">
        <div className="w-full sm:w-48 h-40 bg-slate-200 flex-shrink-0" />
        <div className="flex-1 p-5 space-y-3">
          <div className="h-3 bg-slate-200 rounded w-1/4" />
          <div className="h-5 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-3/4" />
          <div className="flex gap-2">
            <div className="h-5 bg-slate-200 rounded w-16" />
            <div className="h-5 bg-slate-200 rounded w-16" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden animate-pulse">
      <div className="h-48 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-2/3" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-slate-200 rounded w-14" />
          <div className="h-5 bg-slate-200 rounded w-14" />
        </div>
      </div>
    </div>
  );
};

// ── MAIN CATALOGUE PAGE ────────────────────────────────────────
const CataloguePage = ({ onBack }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('default');
  const [sortOpen, setSortOpen] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const navigate = useNavigate();

  // ── Live Firestore sync with fallback ──
  useEffect(() => {
    const q = query(collection(db, 'catalogue'), orderBy('name', 'asc'));
    setLoading(true);
    return onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(data.length > 0 ? data : FALLBACK_ITEMS);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setItems(FALLBACK_ITEMS);
        setLoading(false);
      }
    );
  }, []);

  // ── Category counts ──
  const categoryCounts = useMemo(() => {
    const counts = { All: items.length };
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  // ── Filter + sort items ──
  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      const matchSearch =
        !search ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
        item.category?.toLowerCase().includes(search.toLowerCase()) ||
        (Array.isArray(item.features) && item.features.some((f) => f.toLowerCase().includes(search.toLowerCase())));

      const matchCat = category === 'All' || item.category === category;
      const matchPremium = !premiumOnly || item.premium;

      return matchSearch && matchCat && matchPremium;
    });

    const getPrice = (item) =>
      typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);

    switch (sortBy) {
      case 'price-asc':
        result = [...result].sort((a, b) => getPrice(a) - getPrice(b));
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => getPrice(b) - getPrice(a));
        break;
      case 'name-asc':
        result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'fastest':
        result = [...result].sort(
          (a, b) => turnaroundToHours(a.estimatedTurnaround) - turnaroundToHours(b.estimatedTurnaround)
        );
        break;
      default:
        break;
    }

    return result;
  }, [items, search, category, premiumOnly, sortBy]);

  const hasActiveFilters = search || category !== 'All' || premiumOnly || sortBy !== 'default';

  const clearAllFilters = () => {
    setSearch('');
    setCategory('All');
    setPremiumOnly(false);
    setSortBy('default');
  };

  // ── Quick order handler ──
  const handleQuickOrder = useCallback((item) => {
    const completeItem = {
      ...item,
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price || 0),
      printTypes: item.printTypes || ['document'],
      colorOptions: item.colorOptions || ['bw', 'color'],
      paperSizes: item.paperSizes || ['A4'],
      bindingOptions: item.bindingOptions || ['none'],
      estimatedTurnaround: item.estimatedTurnaround || '2-3 days',
    };

    toast.success(`Selected: ${item.name} • RM ${completeItem.price.toFixed(2)}/page`, {
      duration: 2500,
      icon: '🚀',
    });

    setTimeout(() => {
      navigate(`/customer/dashboard/print-order/${item.id}`, {
        state: {
          catalogueItem: completeItem,
        },
        replace: false,
      });
    }, 300);
  }, [navigate]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Recommended';

  return (
    <div style={{ padding: '0px 0 80px' }}>
      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm rounded-3xl mb-6">
        <div className="max-w-7xl mx-auto px-6 py-5">
          {/* Top Row */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Printing Catalogue
                <Sparkles size={18} className="text-indigo-400" />
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {loading
                  ? 'Loading services…'
                  : `${filtered.length} service${filtered.length !== 1 ? 's' : ''} available`}
              </p>
            </div>

            {/* View Toggle */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid'
                  ? 'bg-white shadow-sm text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <Grid3x3 size={17} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list'
                  ? 'bg-white shadow-sm text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <List size={17} />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services, features…"
                className="w-full pl-9 pr-9 h-10 bg-slate-100 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 flex-shrink-0 sm:flex-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${category === cat
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {cat}
                  {categoryCounts[cat] != null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${category === cat ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
                        }`}
                    >
                      {categoryCounts[cat]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-2 px-4 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 transition-colors whitespace-nowrap"
              >
                <ArrowUpDown size={14} />
                <span className="hidden md:inline">{currentSortLabel}</span>
                <span className="md:hidden">Sort</span>
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setSortOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-40"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${sortBy === opt.value
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Premium Toggle */}
            <button
              onClick={() => setPremiumOnly((p) => !p)}
              className={`flex items-center gap-1.5 px-4 h-10 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 border ${premiumOnly
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-amber-500/30'
                : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'
                }`}
            >
              <Star size={13} fill={premiumOnly ? 'currentColor' : 'none'} />
              Premium
            </button>
          </div>

          {/* Active Filters Bar */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 overflow-hidden"
            >
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Filters:
              </span>
              {search && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
                  "{search}"
                  <button onClick={() => setSearch('')} className="hover:text-indigo-900">
                    <X size={12} />
                  </button>
                </span>
              )}
              {category !== 'All' && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
                  {category}
                  <button onClick={() => setCategory('All')} className="hover:text-indigo-900">
                    <X size={12} />
                  </button>
                </span>
              )}
              {premiumOnly && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg">
                  Premium only
                  <button onClick={() => setPremiumOnly(false)} className="hover:text-amber-900">
                    <X size={12} />
                  </button>
                </span>
              )}
              {sortBy !== 'default' && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg">
                  {currentSortLabel}
                  <button onClick={() => setSortBy('default')} className="hover:text-indigo-900">
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="ml-auto text-xs font-bold text-slate-400 hover:text-red-500 transition-colors whitespace-nowrap"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <main className="max-w-7xl mx-auto px-6 py-8 pb-24">
        {loading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-4'
            }
          >
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} viewMode={viewMode} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <Package size={56} className="text-slate-300 mb-4" />
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-2">
              No Services Found
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Try adjusting your search or filters to find what you're looking for
            </p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
            >
              Clear all filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            layout
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-4'
            }
          >
            <AnimatePresence>
              {filtered.map((item) => (
                <CatalogueCard
                  key={item.id}
                  item={item}
                  onQuickOrder={handleQuickOrder}
                  viewMode={viewMode}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ── MOBILE VIEW TOGGLE (floating) ── */}
      <div className="sm:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))}
          className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-500/40"
          aria-label="Toggle view mode"
        >
          {viewMode === 'grid' ? <List size={20} /> : <Grid3x3 size={20} />}
        </button>
      </div>
    </div>
  );
};

export default CataloguePage;