import React, { useState, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import {
  Search, Phone, Mail, MapPin, TrendingUp,
  Users, X, Clock, Award, Crown, Download, Printer,
  DollarSign, BarChart2, Package, ArrowUpRight,
  Zap
} from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';

// ─── SAFE DATE UTILS ──────────────────────────────────────────────────────────
const safeParseDate = (v) => {
  if (!v) return null;
  try {
    if (v?.toDate) return v.toDate();
    if (typeof v === 'string') { const d = new Date(v); return isNaN(d) ? null : d; }
    if (typeof v === 'number') return new Date(v);
    if (v instanceof Date) return v;
  } catch { return null; }
  return null;
};
const safeFormat = (v, f) => { const d = safeParseDate(v); return d ? format(d, f) : '—'; };

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
const exportCSV = (customers) => {
  const header = ['Name', 'Email', 'Phone', 'Address', 'Total Orders', 'Total Spent (RM)', 'Last Order'];
  const rows = customers.map(c => [
    c.name, c.email, c.phone, c.address,
    c.totalOrders, c.totalSpent.toFixed(2),
    safeFormat(c.lastOrderDate, 'yyyy-MM-dd HH:mm')
  ]);
  const csv = [header, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `customers_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
};

// ─── CUSTOM CHART TOOLTIP ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-indigo-100 rounded-xl px-4 py-3 shadow-xl shadow-indigo-100/50">
      <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-black" style={{ color: p.color }}>
          {p.name === 'revenue' ? 'RM ' : ''}{typeof p.value === 'number' ? p.value.toLocaleString('en-MY', { maximumFractionDigits: 2 }) : p.value}
          <span className="text-xs font-semibold text-slate-400 ml-1">{p.name}</span>
        </p>
      ))}
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-indigo-100/60 transition-all duration-300 p-5 group cursor-default"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent} shadow-md`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <ArrowUpRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 transition-colors" />
    </div>
    <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
    <p className="text-sm font-semibold text-slate-500 mt-1">{label}</p>
    {sub && <p className="text-xs text-slate-300 mt-0.5">{sub}</p>}
  </motion.div>
);

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 'md', rank }) => {
  const palettes = [
    'from-indigo-500 to-violet-600', 'from-blue-500 to-indigo-600',
    'from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-indigo-400 to-cyan-500',
  ];
  const color = palettes[(name?.charCodeAt(0) || 0) % palettes.length];
  const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-10 h-10 text-base', lg: 'w-16 h-16 text-2xl' };
  return (
    <div className={`relative ${sizes[size]} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center font-black text-white shadow-md flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase()}
      {rank !== undefined && rank < 3 && (
        <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white ${
          rank === 0 ? 'bg-amber-400' : rank === 1 ? 'bg-slate-400' : 'bg-orange-500'
        }`}>{rank + 1}</span>
      )}
    </div>
  );
};

// ─── REVENUE RING ─────────────────────────────────────────────────────────────
const RevenueRing = ({ saleTotal, printTotal }) => {
  const total = saleTotal + printTotal;
  if (!total) return <div className="text-center text-slate-300 text-sm py-8">No revenue data</div>;
  const data = [
    { name: 'Sales', value: saleTotal, color: '#6366f1' },
    { name: 'Print', value: printTotal || 0.0001, color: '#06b6d4' },
  ];
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={44} outerRadius={62} dataKey="value" strokeWidth={0} paddingAngle={3}>
              {data.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</p>
          <p className="text-base font-black text-slate-900 leading-tight">RM {total.toFixed(0)}</p>
        </div>
      </div>
      <div className="flex gap-4 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-xs text-slate-500 font-medium">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const CustomersPage = () => {
  const [searchTerm, setSearchTerm]               = useState('');
  const [selectedCustomer, setSelectedCustomer]   = useState(null);
  const [showProfile, setShowProfile]             = useState(false);
  const [chartRange, setChartRange]               = useState(30);

  const { data: customers  = [] } = useFirestore('customers');
  const { data: sales      = [] } = useFirestore('sales');
  const { data: printJobs  = [] } = useFirestore('printJobs');

  // ── Build enriched customer map ─────────────────────────────────────────────
  const orderingCustomers = useMemo(() => {
    const map = new Map();
    const upsert = (key, defaults) => {
      if (!key) return null;
      if (!map.has(key)) {
        map.set(key, {
          ...defaults,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          orders: [],
          services: {},
          serviceList: [],
        });
      }
      return map.get(key);
    };

    customers.forEach(cu => {
      const key = cu.uid || cu.id || cu.email?.toLowerCase().trim();
      const profile = upsert(key, {
        id: cu.uid || cu.id,
        uid: cu.uid || cu.id,
        name: cu.displayName || cu.name || cu.username || 'Customer',
        email: cu.email || '',
        phone: cu.phoneNumber || cu.phone || '',
        address: cu.address || '',
        accountStatus: cu.accountStatus || 'active',
        emailVerified: cu.emailVerified ?? false,
        createdAt: cu.createdAt,
      });
      if (!profile) return;
      profile.name = cu.displayName || cu.name || profile.name;
      profile.email = cu.email || profile.email;
      profile.phone = cu.phoneNumber || cu.phone || profile.phone;
      profile.address = cu.address || profile.address;
      profile.accountStatus = cu.accountStatus || profile.accountStatus;
      profile.emailVerified = cu.emailVerified ?? profile.emailVerified;
    });

    const addService = (customer, serviceName) => {
      const service = serviceName || 'Print Service';
      customer.services[service] = (customer.services[service] || 0) + 1;
      customer.serviceList = Object.entries(customer.services)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
    };

    sales.forEach(sale => {
      const key = sale.customerId || sale.customerEmail?.toLowerCase().trim();
      const c = upsert(key, { id: sale.customerId, name: sale.customerName || 'Customer', email: sale.customerEmail, phone: '', address: '' });
      if (!c) return;
      c.totalOrders++;
      c.totalSpent += Number(sale.total || 0);
      const d = safeParseDate(sale.createdAt || sale.timestamp || sale.created_at);
      addService(c, sale.serviceType || 'POS Sale');
      if (d) { c.orders.push({ type: 'sale', service: sale.serviceType || 'POS Sale', amount: Number(sale.total || 0), date: d }); if (!c.lastOrderDate || d > c.lastOrderDate) c.lastOrderDate = d; }
    });
    printJobs.forEach(job => {
      const key = job.customerId || job.customerEmail?.toLowerCase().trim();
      const c = upsert(key, { id: job.customerId, name: job.customerName || 'Customer', email: job.customerEmail, phone: '', address: '' });
      if (!c) return;
      const amount = Number(job.totalPrice || job.price || 0);
      const service = job.catalogueItem || job.serviceType || job.printType || 'Print Job';
      c.totalOrders++;
      if (job.paymentStatus === 'paid') c.totalSpent += amount;
      addService(c, service);
      const d = safeParseDate(job.createdAt || job.timestamp);
      if (d) {
        c.orders.push({
          type: 'print',
          service,
          amount,
          paid: job.paymentStatus === 'paid',
          status: job.status || 'pending',
          paymentStatus: job.paymentStatus || 'unpaid',
          pages: job.pages,
          deliverySelected: job.deliverySelected,
          paymentToken: job.paymentToken,
          date: d
        });
        if (!c.lastOrderDate || d > c.lastOrderDate) c.lastOrderDate = d;
      }
    });
    return Array.from(map.values())
      .sort((a, b) => {
        if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
        const bd = safeParseDate(b.createdAt)?.getTime?.() || 0;
        const ad = safeParseDate(a.createdAt)?.getTime?.() || 0;
        return bd - ad;
      })
      .slice(0, 200);
  }, [customers, sales, printJobs]);

  // ── Global stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total       = orderingCustomers.length;
    const totalOrders = orderingCustomers.reduce((s, c) => s + c.totalOrders, 0);
    const totalRev    = orderingCustomers.reduce((s, c) => s + c.totalSpent, 0);
    const avgRev      = total ? totalRev / total : 0;
    return { total, totalOrders, totalRev, avgRev };
  }, [orderingCustomers]);

  // ── Orders-per-day area chart ────────────────────────────────────────────────
  const activityData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), chartRange - 1), end: new Date() });
    const dayMap = new Map(days.map(d => [format(d, 'yyyy-MM-dd'), { date: format(d, 'MMM d'), orders: 0, revenue: 0 }]));
    orderingCustomers.forEach(c =>
      c.orders.forEach(o => {
        const pd = safeParseDate(o.date);
        if (!pd) return;
        const key = format(pd, 'yyyy-MM-dd');
        if (dayMap.has(key)) { const e = dayMap.get(key); e.orders++; if (o.amount) e.revenue += o.amount; }
      })
    );
    return Array.from(dayMap.values());
  }, [orderingCustomers, chartRange]);


  // ── Bar chart top 8 ──────────────────────────────────────────────────────────
  const topBarData = useMemo(() =>
    orderingCustomers.slice(0, 8).map(c => ({
      name: c.name.split(' ')[0],
      orders: c.totalOrders,
    })),
    [orderingCustomers]
  );

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() =>
    orderingCustomers.filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.serviceList?.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [orderingCustomers, searchTerm]
  );

  const openProfile = (c) => { setSelectedCustomer(c); setShowProfile(true); };

  // ── Profile analytics ─────────────────────────────────────────────────────────
  const profileAnalytics = useMemo(() => {
    if (!selectedCustomer) return null;
    const saleOrders  = selectedCustomer.orders.filter(o => o.type === 'sale');
    const printOrders = selectedCustomer.orders.filter(o => o.type === 'print');
    const saleTotal = saleOrders.reduce((s, o) => s + (o.amount || 0), 0);
    const printTotal = printOrders.reduce((s, o) => s + (o.paid === false ? 0 : (o.amount || 0)), 0);
    const totalSpent  = selectedCustomer.totalSpent || 0;

    const monthMap = new Map();
    selectedCustomer.orders.forEach(o => {
      const pd = safeParseDate(o.date);
      if (!pd) return;
      const key = format(pd, 'MMM yy');
      if (!monthMap.has(key)) monthMap.set(key, { month: key, orders: 0, revenue: 0 });
      const m = monthMap.get(key);
      m.orders++;
      if (o.amount) m.revenue += o.amount;
    });

    return { saleOrders, printOrders, saleTotal, printTotal, totalSpent, monthlyData: Array.from(monthMap.values()).slice(-6), services: selectedCustomer.serviceList || [] };
  }, [selectedCustomer]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-5 lg:p-8 space-y-5"
      style={{
        background: 'linear-gradient(145deg, #eef2ff 0%, #f8faff 40%, #e0e7ff 100%)',
        fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
      }}
    >

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-200/60">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Ordering Customers</h1>
            <p className="text-sm text-indigo-400 font-semibold mt-1">{stats.total} active customers</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              placeholder="Search name, email, phone…"
              className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100 transition"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => exportCSV(filteredCustomers)}
            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Active Customers"  value={stats.total}    delay={0}     accent="bg-gradient-to-br from-indigo-500 to-indigo-600" />
        <StatCard icon={Package}    label="Total Orders"      value={stats.totalOrders} delay={0.05} accent="bg-gradient-to-br from-violet-500 to-indigo-500" />
        <StatCard icon={DollarSign} label="Total Revenue"     value={`RM ${stats.totalRev.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`} delay={0.1} accent="bg-gradient-to-br from-emerald-500 to-teal-500" sub="from sales" />
        <StatCard icon={TrendingUp} label="Avg Revenue / Cust" value={`RM ${stats.avgRev.toFixed(0)}`} delay={0.15} accent="bg-gradient-to-br from-blue-500 to-cyan-500" />
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Area chart: activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="xl:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-black text-slate-900">Order Activity</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Orders and revenue over time</p>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setChartRange(d)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${chartRange === d ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                interval={chartRange === 7 ? 0 : chartRange === 30 ? 4 : 12} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2.5} fill="url(#gOrders)" dot={false} />
              <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2} fill="url(#gRev)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-5 mt-2">
            {[{ c: '#6366f1', l: 'Orders' }, { c: '#06b6d4', l: 'Revenue (RM)' }].map(({ c, l }) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 rounded-full" style={{ background: c }} />
                <span className="text-xs text-slate-400 font-medium">{l}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── TOP 8 BAR CHART ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-black text-slate-900">Top 8 by Order Count</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Customer orders comparison</p>
          </div>
          <BarChart2 className="w-5 h-5 text-slate-200" />
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={topBarData} barSize={30} margin={{ top: 0, right: 0, left: -22, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eef2ff', radius: 6 }} />
            <Bar dataKey="orders" radius={[7, 7, 0, 0]}>
              {topBarData.map((_, i) => (
                <Cell key={i} fill={['#4338ca', '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#ddd6fe', '#ede9fe'][i] || '#c7d2fe'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── MAIN GRID: TABLE ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

        {/* Customer table */}
        <motion.div
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="xl:col-span-4"
        >
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Table head */}
            <div className="grid grid-cols-12 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40 text-xs font-black uppercase tracking-wider text-slate-400">
              <div className="col-span-5">Customer</div>
              <div className="col-span-3 hidden md:block">Revenue</div>
              <div className="col-span-2 text-center">Orders</div>
              <div className="col-span-2 text-right">Last Order</div>
            </div>

            <div className="divide-y divide-slate-50">
              {filteredCustomers.map((c, i) => (
                <motion.div
                  key={c.id || i} onClick={() => openProfile(c)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.008, 0.3) }}
                  className="grid grid-cols-12 px-6 py-4 items-center hover:bg-indigo-50/40 cursor-pointer group transition-colors"
                >
                  {/* Customer info */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar name={c.name} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-700 transition">{c.name}</p>
                      <p className="text-xs text-slate-400 truncate">{c.email}</p>
                      {c.serviceList?.length > 0 && (
                        <p className="text-xs text-indigo-400 truncate mt-0.5">
                          {c.serviceList.slice(0, 2).map(s => s.name).join(' • ')}
                        </p>
                      )}
                      {c.phone && (
                        <p className="text-xs text-slate-300 truncate flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />{c.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Revenue bar */}
                  <div className="col-span-3 hidden md:block pr-4">
                    {c.totalSpent > 0 ? (
                      <div>
                        <p className="text-sm font-black text-emerald-600">RM {c.totalSpent.toFixed(2)}</p>
                        <div className="w-28 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full"
                            style={{ width: `${Math.min((c.totalSpent / (orderingCustomers[0]?.totalSpent || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : <span className="text-xs text-slate-300">{c.totalOrders > 0 ? 'Unpaid/no revenue' : 'No orders yet'}</span>}
                  </div>

                  {/* Orders badge */}
                  <div className="col-span-2 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-black rounded-xl border border-indigo-100/80 group-hover:bg-indigo-100 transition">
                      <Award className="w-3.5 h-3.5" />{c.totalOrders}
                    </span>
                  </div>

                  {/* Last order */}
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-bold text-slate-700">{safeFormat(c.lastOrderDate, 'MMM dd')}</p>
                    <p className="text-xs text-slate-400">{safeFormat(c.lastOrderDate, 'HH:mm')}</p>
                  </div>
                </motion.div>
              ))}

              {filteredCustomers.length === 0 && (
                <div className="py-24 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-base font-bold text-slate-400">No customers found</p>
                  <p className="text-sm text-slate-300 mt-1">Try a different search term</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-600">{filteredCustomers.length}</span> of {orderingCustomers.length} customers
              </p>
              <button
                onClick={() => exportCSV(filteredCustomers)}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1 transition"
              >
                <Download className="w-3.5 h-3.5" /> Export this list
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── PROFILE MODAL ── */}
      <AnimatePresence>
        {showProfile && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowProfile(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 48, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 48, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-indigo-200/50 overflow-hidden max-h-[92vh] flex flex-col border border-slate-200"
              style={{ fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif" }}
            >
              {/* Modal header */}
              <div className="px-7 py-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-blue-50/60 to-white flex-shrink-0">
                <div className="flex items-start gap-5">
                  <Avatar name={selectedCustomer.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedCustomer.name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                          <Mail className="w-3 h-3 text-indigo-400" />{selectedCustomer.email}
                        </span>
                      )}
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                          <Phone className="w-3 h-3 text-emerald-400" />{selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.address && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                          <MapPin className="w-3 h-3 text-rose-400" />{selectedCustomer.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowProfile(false)}
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition shrink-0 mt-0.5"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </motion.button>
                </div>
              </div>

              {/* Modal stat pills */}
              {profileAnalytics && (
                <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 flex-shrink-0 bg-slate-50/60">
                  {[
                    { label: 'Total Orders', value: selectedCustomer.totalOrders, color: 'text-indigo-600' },
                    { label: 'Revenue',       value: `RM ${profileAnalytics.totalSpent.toFixed(2)}`, color: 'text-emerald-600' },
                    { label: 'Sale Orders',  value: profileAnalytics.saleOrders.length, color: 'text-blue-600' },
                    { label: 'Print Jobs',   value: profileAnalytics.printOrders.length, color: 'text-cyan-600' },
                  ].map(s => (
                    <div key={s.label} className="py-4 px-4 text-center">
                      <p className={`text-xl font-black ${s.color} leading-none`}>{s.value}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal body */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">

                {/* Monthly chart + ring */}
                {profileAnalytics?.monthlyData?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Monthly Orders</h4>
                      <ResponsiveContainer width="100%" height={130}>
                        <BarChart data={profileAnalytics.monthlyData} barSize={18} margin={{ left: -22, top: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eef2ff', radius: 4 }} />
                          <Bar dataKey="orders" fill="#6366f1" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center justify-center gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Revenue Split</h4>
                      <RevenueRing
                        saleTotal={profileAnalytics.saleTotal}
                        printTotal={profileAnalytics.printTotal}
                      />
                    </div>
                  </div>
                )}

                {profileAnalytics?.services?.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Services Used</h4>
                    <div className="flex flex-wrap gap-2">
                      {profileAnalytics.services.map(service => (
                        <span
                          key={service.name}
                          className="px-3 py-2 rounded-xl bg-white border border-indigo-100 text-xs font-black text-indigo-600 shadow-sm"
                        >
                          {service.name} × {service.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order history */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Order History ({selectedCustomer.orders.filter(o => o.date).length} timestamped)
                  </h4>
                  <div className="space-y-2">
                    {selectedCustomer.orders
                      .filter(o => o.date)
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 12)
                      .map((order, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.025 }}
                          className="flex items-center justify-between px-5 py-3.5 bg-white hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-xl group transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              order.type === 'sale' ? 'bg-indigo-50 text-indigo-500' : 'bg-cyan-50 text-cyan-500'
                            }`}>
                              {order.type === 'sale' ? <DollarSign className="w-5 h-5" /> : <Printer className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition">
                                {order.service || (order.type === 'sale' ? 'Sale Order' : 'Print Job')}
                              </p>
                              {order.amount ? <p className={`text-xs font-bold ${order.paid === false ? 'text-amber-600' : 'text-emerald-600'}`}>RM {Number(order.amount).toFixed(2)}{order.paid === false ? ' unpaid' : ''}</p> : null}
                              {order.pages  && <p className="text-xs text-cyan-600 font-bold">{order.pages} pages</p>}
                              {order.deliverySelected && <p className="text-xs text-indigo-500 font-bold">Delivery selected</p>}
                              {order.paymentToken && <p className="text-[10px] text-slate-400 font-mono">{order.paymentToken}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">{safeFormat(order.date, 'MMM dd, yyyy')}</p>
                            <p className="text-xs text-slate-400">{safeFormat(order.date, 'HH:mm')}</p>
                          </div>
                        </motion.div>
                      ))}
                    {selectedCustomer.orders.filter(o => o.date).length === 0 && (
                      <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                        <Clock className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                        <p className="font-bold text-sm text-slate-400">No timestamped orders</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomersPage;
