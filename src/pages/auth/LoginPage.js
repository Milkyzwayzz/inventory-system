import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  Printer,
  ArrowRight,
  Loader2,
  LogOut,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { auth, db } from "../../firebase";
import toast from 'react-hot-toast';
import {
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Link, useNavigate } from 'react-router-dom';

const withTimeout = (promise, ms = 5000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Request timed out. Please try again."));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const Button = ({ children, variant = "primary", size = "md", loading = false, className = "", ...props }) => {
  const base = "inline-flex items-center justify-center rounded-2xl font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transform cursor-pointer";
  const variants = {
    primary: "btn-primary text-white",
    secondary: "bg-white text-slate-900 border-2 border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30",
    outline: "border-2 border-slate-200 bg-transparent hover:border-indigo-400 text-slate-700 hover:text-indigo-600",
  };
  const sizes = { sm: "px-4 py-2 text-xs", md: "px-6 py-4 text-sm", lg: "px-8 py-5 text-base" };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : children}
    </button>
  );
};

const Input = ({ icon: Icon, label, error, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === 'password';

  return (
    <div className="space-y-2 w-full text-left">
      {label && <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.2em] ml-1">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          {...props}
          type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
          className={`w-full ${Icon ? 'pl-14' : 'px-6'} ${isPassword ? 'pr-14' : 'pr-6'} py-4 bg-slate-50/50 border-2 border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300 ${error ? 'border-red-300 ring-2 ring-red-200/50 focus:border-red-500' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1 ml-1 font-bold">{error}</p>}
    </div>
  );
};

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const navigate = useNavigate();

  // Failed login lockout check
  useEffect(() => {
    const checkLock = () => {
      const lockUntilStr = localStorage.getItem('loginLockUntil');
      if (lockUntilStr) {
        const lockUntil = parseInt(lockUntilStr, 10);
        const now = Date.now();
        if (lockUntil > now) {
          setLockTimeRemaining(Math.ceil((lockUntil - now) / 1000));
        } else {
          localStorage.removeItem('loginLockUntil');
          localStorage.removeItem('failedLoginAttempts');
          setLockTimeRemaining(0);
        }
      }
    };

    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdminLogin = () => {
    const inputEmail = form.email.trim().toLowerCase();

    // 1. Master admin backdoor (always works)
    if (inputEmail === 'admin123@gmail.com' && form.password === 'admin321') {
      return true;
    }

    try {
      const saved = localStorage.getItem('adminProfile');
      if (saved) {
        const adminProfile = JSON.parse(saved);
        return inputEmail === (adminProfile.email || '').toLowerCase() && form.password === adminProfile.password;
      }
    } catch (e) {
      console.error("Failed to parse admin profile:", e);
    }
    return false;
  };

  const validate = () => {
    let err = {};
    if (!form.email.trim()) {
      err.email = "Email is required";
    } else if (!form.email.includes("@")) {
      err.email = "Invalid email format";
    }

    if (!form.password) {
      err.password = "Password is required";
    } else if (form.password.length < 6) {
      err.password = "Password must be at least 6 characters";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockTimeRemaining > 0) return;
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (isAdminMode) {
        // ADMIN LOGIN
        if (!isAdminLogin()) {
          throw { code: 'auth/wrong-password', message: 'Incorrect credentials' };
        }
        localStorage.removeItem('failedLoginAttempts');
        localStorage.removeItem('loginLockUntil');
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminEmail', form.email);
        toast.success("🔐 Admin login successful!");
        navigate('/admin/dashboard');
        return;
      }

      // CUSTOMER LOGIN
      const loginPromise = (async () => {
        const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
        const user = userCredential.user;

        const customerDoc = await getDoc(doc(db, "customers", user.uid));
        if (!customerDoc.exists()) {
          await setDoc(doc(db, "customers", user.uid), {
            name: user.displayName || user.email?.split('@')[0] || 'Customer',
            email: user.email || form.email.toLowerCase(),
            totalOrders: 0,
            totalSpent: 0,
            createdAt: serverTimestamp()
          });
        }
        return userCredential;
      })();

      await withTimeout(loginPromise, 5000);

      localStorage.removeItem('failedLoginAttempts');
      localStorage.removeItem('loginLockUntil');
      localStorage.removeItem('isAdmin');
      toast.success("🎉 Welcome back!");
      navigate('/customer/dashboard');

    } catch (err) {
      console.error("Login error:", err);

      const attemptsStr = localStorage.getItem('failedLoginAttempts') || '0';
      const newAttempts = parseInt(attemptsStr, 10) + 1;
      localStorage.setItem('failedLoginAttempts', newAttempts.toString());

      let errorMsg = "Login failed";
      if (err.message === "Request timed out. Please try again.") {
        errorMsg = err.message;
      } else {
        switch (err.code) {
          case 'auth/user-not-found': errorMsg = "User not found. Please sign up first."; break;
          case 'auth/wrong-password': errorMsg = "Incorrect email or password"; break;
          case 'auth/invalid-credential': errorMsg = "Invalid email or password"; break;
          default: errorMsg = err.message || "Login failed";
        }
      }

      if (newAttempts >= 5) {
        const lockUntil = Date.now() + 60000; // 60 seconds lockout
        localStorage.setItem('loginLockUntil', lockUntil.toString());
        setLockTimeRemaining(60);
        setErrors({ general: "Too many failed attempts. Account locked for 60 seconds." });
        toast.error("Account locked for 60 seconds.");
      } else {
        setErrors({ general: errorMsg });
        toast.error(`${errorMsg} (${5 - newAttempts} attempts left)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockTimeRemaining > 0;

  return (
    <div className="login-bg min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Premium background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none" />

      <div
        className="w-full max-w-lg p-10 rounded-[3rem] relative z-10"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.08)'
        }}
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img
              src="/logo_tech.png"
              alt="Logo"
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = e.target.nextSibling;
                if (fallback) fallback.style.display = 'block';
              }}
              className="h-48 w-auto object-contain float-icon"
            />
            <Printer size={40} className="mx-auto text-indigo-600 float-icon" style={{ display: 'none' }} />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">Welcome Back!</h1>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl mb-8">
          <button
            type="button"
            disabled={isLocked}
            onClick={() => {
              setIsAdminMode(false);
              setErrors({});
            }}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isAdminMode
              ? 'bg-white text-indigo-600 shadow-md'
              : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'
              }`}
          >
            👥 Customer
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => {
              setIsAdminMode(true);
              setErrors({});
            }}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isAdminMode
              ? 'bg-white text-indigo-600 shadow-md'
              : 'text-slate-500 hover:text-slate-800 disabled:opacity-50'
              }`}
          >
            🔐 Admin
          </button>
        </div>

        {isLocked && (
          <div className="mb-6 text-red-600 text-sm font-bold text-center p-4 bg-red-100/80 border border-red-300 rounded-2xl flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle size={16} /> Too many failed attempts. Locked for {lockTimeRemaining}s.
          </div>
        )}

        {errors.general && !isLocked && (
          <div className="mb-6 text-red-500 text-sm text-center p-4 bg-red-50/80 rounded-2xl border border-red-200">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label={isAdminMode ? "Admin Email" : "Email Address"}
              icon={Mail}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={isAdminMode ? "admin@krishsantech.com" : "user@company.com"}
              disabled={isLocked || loading}
              error={errors.email}
            />
          </div>

          <div>
            <Input
              label="Password"
              type="password"
              icon={Lock}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              disabled={isLocked || loading}
              error={errors.password}
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={isLocked}
            className="w-full h-14 text-lg shadow-2xl"
          >
            {loading ? "Signing In..." : isLocked ? "Locked" : "Sign In"} <ArrowRight size={18} className="ml-2" />
          </Button>

          {!isAdminMode && (
            <div className="text-center pt-8 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-4">
                New customer?{' '}
                <Link
                  to="/signup"
                  className="font-bold text-indigo-600 hover:text-indigo-700 underline decoration-2 underline-offset-4 transition-all duration-200"
                >
                  Create Account →
                </Link>
              </p>
              <p className="text-xs text-slate-400">© 2026 Krishsan Tech Enterprise. All rights reserved.</p>
            </div>
          )}

          {isAdminMode && (
            <div className="text-center pt-8 border-t border-slate-200">
              <p className="text-xs text-slate-400">© 2026 Krishsan Tech Enterprise. Administrator Terminal.</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
