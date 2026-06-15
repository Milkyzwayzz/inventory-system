// src/App.jsx
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import {
  LayoutDashboard, Calculator, Package, TrendingUp,
  Users, FileBarChart, Printer, LogOut, Palette, Eye, EyeOff,
  Menu, X
} from 'lucide-react';
import { auth } from './firebase';

// ── Page imports ──────────────────────────────────────────────
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import Dashboard from './pages/admin/AdminPortal';
import CustomersPage from './pages/admin/Customers';
import ReportsPage from './pages/admin/Reports';
import CustomerPortal from './pages/customer/CustomerPortal';
import PrintingPage from './pages/admin/Printing';
import CatalogueAdmin from './pages/admin/CatalogueAdmin';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';

// ─────────────────────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────────────────────
const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return React.useContext(AuthContext);
}

// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTE
// ─────────────────────────────────────────────────────────────
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (loading) return <LoadingScreen />;

  if (requiredRole === 'admin') {
    return isAdmin ? children : <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requiredRole === 'customer') {
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
    return children;
  }
  return (user || isAdmin) ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

// ─────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-2xl mx-auto mb-6"
        />
        <h1 className="text-2xl font-black gradient-text tracking-tight mb-1">PRESS PRO</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initializing Terminal</p>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADMIN SHELL
// ─────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard, gradient: 'from-indigo-500 to-blue-500' },
  { to: '/admin/printing', label: 'Print Queue', Icon: Printer, gradient: 'from-purple-500 to-pink-500' },
  { to: '/admin/customers', label: 'Customers', Icon: Users, gradient: 'from-cyan-500 to-sky-500' },
  { to: '/admin/catalogue', label: 'Catalogue', Icon: Palette, gradient: 'from-amber-500 to-orange-500' },
  { to: '/admin/reports', label: 'Reports', Icon: FileBarChart, gradient: 'from-teal-500 to-green-600' },
];

// SidebarLink uses useLocation so active state is always correct
function SidebarLink({ to, label, Icon }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`
        flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold text-xs
        uppercase tracking-wider border-2 transition-all duration-200
        ${active
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-indigo-500/20 scale-[1.02]'
          : 'bg-slate-900/95 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white'
        }
      `}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/15' : 'bg-slate-800'}`}>
        <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-300'}`} strokeWidth={active ? 3 : 2.5} />
      </div>
      <span>{label}</span>
    </Link>
  );
}

function AdminShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [adminProfile, setAdminProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('adminProfile');
      return saved ? JSON.parse(saved) : { name: 'Administrator', email: 'admin123@gmail.com', password: 'admin321', systemPref: 'Standard Layout' };
    } catch {
      return { name: 'Administrator', email: 'admin123@gmail.com', password: 'admin321', systemPref: 'Standard Layout' };
    }
  });

  const [editForm, setEditForm] = useState({ ...adminProfile });
  const [showPassword, setShowPassword] = useState(false);

  // Mobile layout state and handler
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) {
        setMobileOpen(false);
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Auto-close sidebar on mobile when navigating pages
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem('adminProfile', JSON.stringify(editForm));
    setAdminProfile({ ...editForm });
    setShowProfileModal(false);
    toast.success('Admin profile updated successfully!');
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      {/* Mobile Top Bar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-slate-950 text-slate-100 flex items-center justify-between px-6 z-40 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/40 flex-shrink-0">
              <Printer className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xs font-black text-white tracking-tight uppercase leading-none">KRISHSAN TECH</h1>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Admin</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 bg-slate-850 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-slate-200" />
          </button>
        </div>
      )}

      {/* Backdrop Overlay for Mobile Drawer */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-45 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        animate={{ 
          width: isMobile ? 280 : (collapsed ? 80 : 280),
          x: isMobile ? (mobileOpen ? 0 : -280) : 0
        }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="fixed h-full z-50 flex flex-col bg-slate-950 text-slate-100 border-r border-slate-800/70 overflow-hidden"
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/70 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${collapsed && !isMobile ? 'justify-center' : ''}`}>
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/40 flex-shrink-0">
                <Printer className="w-6 h-6 text-white" />
              </div>
              {(!collapsed || isMobile) && (
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight leading-none">KRISHSAN TECH ENTERPRISE</h1>
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">ADMIN PORTAL</p>
                </div>
              )}
            </div>
            {isMobile && (
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-slate-200" />
              </button>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="mt-4 w-full p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-colors text-xs font-bold"
            >
              {collapsed ? '→' : '← Collapse'}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {ADMIN_NAV.map(item =>
            (collapsed && !isMobile) ? (
              <Link key={item.to} to={item.to} title={item.label}
                className="flex justify-center p-3 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all">
                <item.Icon className="w-5 h-5" />
              </Link>
            ) : (
              <SidebarLink key={item.to} {...item} />
            )
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/70 space-y-3">
          {(collapsed && !isMobile) ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  setEditForm({ ...adminProfile });
                  setShowProfileModal(true);
                }}
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-all"
                title={adminProfile.name}
              >
                {adminProfile.name.slice(0, 2).toUpperCase()}
              </button>
              <button
                onClick={() => { localStorage.removeItem('isAdmin'); window.location.href = '/login'; }}
                className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditForm({ ...adminProfile });
                  setShowProfileModal(true);
                }}
                className="w-full text-left flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/70 rounded-xl transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                  {adminProfile.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">{adminProfile.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{adminProfile.email}</p>
                </div>
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => { localStorage.removeItem('isAdmin'); window.location.href = '/login'; }}
                className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </motion.button>
            </>
          )}
        </div>
      </motion.aside>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-2">Edit Account Profile</h3>
            <p className="text-xs text-slate-500 mb-6">Modify system access credentials and interface preferences.</p>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={editForm.password}
                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-blue-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Main */}
      <main
        className={`flex-1 overflow-y-auto p-4 md:p-8 transition-all duration-300 ${isMobile ? 'pt-20' : ''}`}
        style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 280) }}
      >
        <div className="max-w-7xl mx-auto animate-page-in">
          {children}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '16px', fontWeight: '700', fontFamily: 'inherit' },
            success: { style: { background: '#10B981', color: '#fff' } },
            error: { style: { background: '#EF4444', color: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />

          {/* Customer */}
          <Route path="/customer/*" element={
            <ProtectedRoute requiredRole="customer"><CustomerPortal /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin/*" element={
            <ProtectedRoute requiredRole="admin">
              <AdminShell>
                <Routes>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="printing" element={<PrintingPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="catalogue" element={<CatalogueAdmin />} />
                  <Route path="reports" element={<ReportsPage />} />
                </Routes>
              </AdminShell>
            </ProtectedRoute>
          } />

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
