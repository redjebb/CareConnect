/*
 * CareConnect - Платформа за Домашен Социален Патронаж
 * Copyright (C) 2026 Адам Биков , Реджеб Туджар
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


/*
 * CareConnect - Платформа за Домашен Социален Патронаж
 * Copyright (C) 2026 Адам Биков, Реджеб Туджар
 */

import 'leaflet/dist/leaflet.css';
import { FormEvent, useEffect, useState } from 'react';
import { Driver } from './types';
import { getDriverByEmail } from './services/driverService';
import { FirebaseUser, getFriendlyErrorMessage, login, logout, subscribeToAuthState } from './services/authService';
import AdminDashboard from './views/AdminDashboard';
import DriverView from './views/DriverView';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import ActivateAccount from './views/activateAccount';
import { Mail, Lock, LogIn, ShieldCheck, AlertCircle, LayoutDashboard, Truck, ClipboardList } from 'lucide-react';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);

  const isMasterAdmin = user?.role === 'MASTER_ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isDriver = user?.role === 'DRIVER';

  // Auth state listener
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(currentUser => {
      setUser(currentUser);
      
      if (!currentUser) {
        setIsDataLoading(false);
        return;
      }

      if (currentUser.role !== undefined) {
        setIsDataLoading(false);
        setError(null);
      } else {
        setIsDataLoading(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load driver profile when user has DRIVER role
  useEffect(() => {
    const loadDriverProfile = async () => {
      if (user && user.role === 'DRIVER' && user.email) {
        try {
          const profile = await getDriverByEmail(user.email);
          setCurrentDriver(profile);
        } catch (err) {
          console.error("Грешка при зареждане на шофьор:", err);
          setCurrentDriver(null);
        }
      } else {
        setCurrentDriver(null);
      }
    };
    void loadDriverProfile();
  }, [user]);

  // Login handler
  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Моля, попълнете имейл и парола.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const loggedInUser = await login(email.trim(), password);
      setEmail('');
      setPassword('');
      if (loggedInUser.role === 'DRIVER') {
        navigate('/driver/view');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    setIsDataLoading(true);
    await logout();
    setUser(null);
    setCurrentDriver(null);
    setIsDataLoading(false);
    navigate('/', { replace: true });
  };

  const inputClasses = "w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 py-4 text-sm text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400";
  const labelClasses = "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-2";

  return (
    <Routes>
      <Route path="/activate" element={<ActivateAccount />} />
      
      <Route 
        path="/admin/dashboard" 
        element={
          <ProtectedRoute user={user} allowedRoles={['MASTER_ADMIN', 'MANAGER']} isDataLoading={isDataLoading}>
            <AdminDashboard userEmail={user?.email ?? ''} isMasterAdmin={isMasterAdmin} onLogout={handleLogout} />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/driver/view" 
        element={
          <ProtectedRoute user={user} allowedRoles={['DRIVER']} isDataLoading={isDataLoading}>
            {currentDriver ? (
              <DriverView userEmail={user?.email ?? ''} currentDriver={currentDriver} onLogout={handleLogout} />
            ) : (
              <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest animate-pulse">Зареждане на профил...</p>
              </main>
            )}
          </ProtectedRoute>
        } 
      />

      <Route path="/" element={
        isDataLoading ? (
          <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </main>
        ) : !user ? (
          <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-10 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px]" />
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              <div className="space-y-8 text-center lg:text-left">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    Добре дошли в <br/> <span className="text-blue-600">CareConnect</span>
                  </h1>
                </div>
                <div className="space-y-4 hidden sm:block">
                  {[
                    { icon: <LayoutDashboard className="w-5 h-5"/>, color: 'text-blue-600', title: 'Управление на маршрути' },
                    { icon: <Truck className="w-5 h-5"/>, color: 'text-emerald-600', title: 'Дигитални подписи и SOS' },
                    { icon: <ClipboardList className="w-5 h-5"/>, color: 'text-amber-600', title: 'Автоматизирани отчети' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 justify-center lg:justify-start">
                      <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                        <span className={item.color}>{item.icon}</span>
                      </div>
                      <p className="font-bold text-slate-700 text-sm tracking-tight">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-2xl shadow-slate-200/60">
                <form className="space-y-6" onSubmit={handleLoginSubmit}>
                  <div>
                    <label className={labelClasses}>Имейл адрес</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClasses} placeholder="name@company.com" required />
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Парола</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} placeholder="••••••••" required />
                    </div>
                  </div>
                  {error && (
                    <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 border border-red-100">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-xs font-bold text-red-600 leading-tight">{error}</p>
                    </div>
                  )}
                  <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50">
                    {isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Влез в системата <LogIn className="w-4 h-4" /></>}
                  </button>
                </form>
              </div>
            </div>
          </main>
        ) : (
          <Navigate to={isDriver ? "/driver/view" : "/admin/dashboard"} replace />
        )
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;