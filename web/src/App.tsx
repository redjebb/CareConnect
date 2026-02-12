import 'leaflet/dist/leaflet.css';
import { FormEvent, useEffect, useState } from 'react';
import { Driver } from './types';
import { getDriverByEmail } from './services/driverService';
import { checkStandardAdminStatus } from './services/adminAccessService';
import { FirebaseUser, getFriendlyErrorMessage, login, logout, subscribeToAuthState } from './services/authService';
import AdminDashboard from './views/AdminDashboard';
import DriverView from './views/DriverView';
import { Routes, Route } from 'react-router-dom';
import ActivateAccount from './views/activateAccount';
import { Mail, Lock, LogIn, ShieldCheck, AlertCircle, LayoutDashboard, Truck, ClipboardList } from 'lucide-react';

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isStandardAdmin, setIsStandardAdmin] = useState<boolean | null>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);

  const ADMIN_EMAIL = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_ADMIN_EMAIL) ?? undefined; 
  const isMasterAdmin = !!(user && ADMIN_EMAIL && user.email === ADMIN_EMAIL);
  const isDriver = !!currentDriver;
  const isAuthorizedAdmin = isMasterAdmin || !!isStandardAdmin;

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(currentUser => {
      setUser(currentUser);
      setError(null);
      setIsDataLoading(!!currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const resolveStandardAdmin = async () => {
      if (!user) {
        if (isMounted) {
          setIsStandardAdmin(false);
          setIsDataLoading(false);
        }
        return;
      }
      const hasAccess = await checkStandardAdminStatus(user.email ?? '');
      if (isMounted) {
        setIsStandardAdmin(hasAccess);
        setIsDataLoading(false);
      }
    };
    setIsStandardAdmin(null);
    setIsDataLoading(true);
    void resolveStandardAdmin();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCurrentDriver(null);
      setIsDataLoading(false);
      return;
    }
    if (!isMasterAdmin && isStandardAdmin === null) return;
    if (isAuthorizedAdmin) {
      setCurrentDriver(null);
      setIsDataLoading(false);
      return;
    }
    const loadDriverProfile = async () => {
      setIsDataLoading(true);
      try {
        if (!user.email) return;
        const profile = await getDriverByEmail(user.email);
        setCurrentDriver(profile);
      } catch (err) {
        setCurrentDriver(null);
      } finally {
        setIsDataLoading(false);
      }
    };
    void loadDriverProfile();
  }, [user, isAuthorizedAdmin, isMasterAdmin, isStandardAdmin]);

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError('Моля, попълнете имейл и парола.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      setPassword('');
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => { await logout(); };

  const inputClasses = "w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 py-4 text-sm text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400";
  const labelClasses = "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-2";

  return (
    <Routes>
      <Route path="/activate" element={<ActivateAccount />} />
      <Route path="*" element={
        isDataLoading ? (
          <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center">
            <div className="animate-pulse">
               <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">CareConnect...</p>
            </div>
          </main>
        ) : user ? (
          isDriver ? (
            <DriverView userEmail={user.email ?? ''} currentDriver={currentDriver} onLogout={handleLogout} />
          ) : isAuthorizedAdmin ? (
            <AdminDashboard userEmail={user.email ?? ''} isMasterAdmin={isMasterAdmin} onLogout={handleLogout} />
          ) : (
            <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl text-center animate-in fade-in zoom-in-95">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-slate-900">Нямате достъп</h1>
                <p className="text-slate-500 text-sm mt-2 mb-6">Акаунтът <b>{user.email}</b> няма права за достъп.</p>
                <button onClick={handleLogout} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all">Изход</button>
              </div>
            </main>
          )
        ) : (
          /* --- LOGIN UI --- */
          <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-10 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px]" />

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              
              {/* ЛЯВА ЧАСТ - С балансиран размер на заглавието */}
              <div className="space-y-8 text-center lg:text-left animate-in fade-in slide-in-from-left-6 duration-700">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  {/* ПРОМЯНАТА Е ТУК: text-3xl за мобилни, 4xl за таблет, 5xl за десктоп */}
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    Добре дошли в <br/> <span className="text-blue-600">CareConnect</span>
                  </h1>
                  <p className="mt-4 text-slate-500 font-medium text-base lg:text-lg max-w-md mx-auto lg:mx-0">
                    Универсална платформа за управление на социални доставки и логистика.
                  </p>
                </div>
                
                <div className="space-y-4 hidden sm:block">
                  {[
                    { icon: <LayoutDashboard className="w-5 h-5"/>, color: 'text-blue-600', title: 'Управление на маршрути' },
                    { icon: <Truck className="w-5 h-5"/>, color: 'text-emerald-600', title: 'Дигитални подписи и SOS' },
                    { icon: <ClipboardList className="w-5 h-5"/>, color: 'text-amber-600', title: 'Автоматизирани отчети' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 justify-center lg:justify-start group">
                      <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                        <span className={item.color}>{item.icon}</span>
                      </div>
                      <p className="font-bold text-slate-700 text-sm tracking-tight">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ДЯСНА ЧАСТ: Форма за вход */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-12 shadow-2xl shadow-slate-200/60 animate-in fade-in zoom-in-95 duration-500">
                <form className="space-y-6" onSubmit={handleLoginSubmit}>
                  <div>
                    <label className={labelClasses}>Имейл адрес</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={inputClasses}
                        placeholder="name@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Парола</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={inputClasses}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 border border-red-100 animate-in shake duration-300">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <p className="text-xs font-bold text-red-600 leading-tight">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Влез в системата <LogIn className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>

            </div>
          </main>
        )
      } />
    </Routes>
  );
}

export default App;