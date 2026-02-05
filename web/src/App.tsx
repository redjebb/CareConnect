import 'leaflet/dist/leaflet.css';
import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import { Driver } from './types';
import { getDriverByEmail } from './driverService';
import { checkStandardAdminStatus } from './services/adminAccessService';
import { FirebaseUser, login, logout, register, subscribeToAuthState } from './services/authService';
import AdminDashboard from './views/AdminDashboard';
import DriverView from './views/DriverView';
import { Routes, Route, Navigate } from 'react-router-dom';
import ActivateAccount from './views/activateAccount';

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

  // --- USE EFFECT HOOKS (Triggering Fetches) ---

  // AUTH STATE LISTENER
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(currentUser => {
      setUser(currentUser);
      setError(null);
      setIsDataLoading(!!currentUser);
    });
    return () => {
      unsubscribe();
    };
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
        console.log('[Auth] Setting isStandardAdmin =', hasAccess);
        setIsStandardAdmin(hasAccess);
        setIsDataLoading(false);
      }
    };

    setIsStandardAdmin(null);
    setIsDataLoading(true);
    void resolveStandardAdmin();

    return () => {
      isMounted = false;
    };
  }, [user, isMasterAdmin]);

  // --- USE EFFECT: LOAD DRIVER PROFILE ---
  useEffect(() => {
    if (!user) {
      setCurrentDriver(null);
      setIsDataLoading(false);
      return;
    }

    if (!isMasterAdmin && isStandardAdmin === null) {
      // Wait until standard admin status resolves
      return;
    }

    if (isAuthorizedAdmin) {
      setCurrentDriver(null);
      setIsDataLoading(false);
      return;
    }

    const loadDriverProfile = async () => {
      setIsDataLoading(true);
      try {
        if (!user.email) {
          return;
        }
        console.log('[DriverProfile] Fetching driver profile for', user.email);
        const profile = await getDriverByEmail(user.email);
        console.log('[DriverProfile] Profile lookup result:', profile ? 'found' : 'not found');
        setCurrentDriver(profile);
      } catch (err) {
        console.error('Неуспешно зареждане на профила на шофьора:', err);
        setCurrentDriver(null);
      } finally {
        setIsDataLoading(false);
      }
    };

    void loadDriverProfile();
  }, [user, isAuthorizedAdmin, isMasterAdmin, isStandardAdmin]);

  // --- HANDLERS ---

  const handleAuthAction = async (action: 'login' | 'register') => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (action === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      setPassword('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Възникна грешка. Моля, опитайте отново.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const ensureCredentials = () => {
    if (!email || !password) {
      setError('Моля, попълнете имейл и парола.');
      return false;
    }
    return true;
  };

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ensureCredentials()) {
      return;
    }
    void handleAuthAction('login');
  };

  const handleRegisterClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!ensureCredentials()) {
      return;
    }
    void handleAuthAction('register');
  };

  const handleLogout = async () => {
    await logout();
  };

  // Single return with clean Routes structure
  return (
    <Routes>
      {/* Activate route - always accessible, independent of auth state */}
      <Route path="/activate" element={<ActivateAccount />} />

      {/* All other routes handled here with auth logic */}
      <Route path="*" element={
        isDataLoading ? (
          <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-12">
            <section className="mx-auto w-full max-w-xl rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">CareConnect</p>
              <h1 className="mt-3 text-2xl font-bold text-slate-900">Зареждане...</h1>
              <p className="mt-3 text-sm text-slate-600">Моля, изчакайте докато проверим достъпа ви.</p>
            </section>
          </main>
        ) : user ? (
          isDriver ? (
            <DriverView
              userEmail={user.email ?? ''}
              currentDriver={currentDriver}
              onLogout={handleLogout}
            />
          ) : isAuthorizedAdmin ? (
            <AdminDashboard
              userEmail={user.email ?? ''}
              isMasterAdmin={isMasterAdmin}
              onLogout={handleLogout}
            />
          ) : (
            /* Гледка за потребител без права */
            <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-12">
              <section className="mx-auto grid w-full max-w-3xl gap-6 rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur-sm">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">CareConnect</p>
                  <h1 className="mt-3 text-3xl font-bold text-slate-900">Нямате достъп</h1>
                  <p className="mt-4 text-slate-600">
                    Вие сте влезли като <span className="font-semibold">{user.email}</span>, но този акаунт няма права.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-500"
                >
                  Изход
                </button>
              </section>
            </main>
          )
        ) : (
          /* Гледка за ВХОД (Когато НЯМА логнат потребител) */
          <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-12">
            <section className="mx-auto grid w-full max-w-5xl gap-10 rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur-sm md:grid-cols-2">
              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">CareConnect</p>
                <h1 className="mt-3 text-3xl font-bold text-slate-900">Вход към административната платформа</h1>
                <p className="mt-4 text-slate-600">
                  Следете шофьорите на терен, управлявайте клиентите и генерирайте месечни отчети от едно място.
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  <li>• Реално време за маршрути и SOS сигнали</li>
                  <li>• Управление на клиенти и шофьори</li>
                  <li>• Автоматизирани HTML/PDF отчети</li>
                </ul>
              </div>

              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">Имейл адрес</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">Парола</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Влизане...' : 'Вход'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRegisterClick}
                    className="flex-1 rounded-lg border border-blue-200 px-6 py-3 font-semibold text-blue-600 shadow hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Създаване...' : 'Регистрация'}
                  </button>
                </div>
              </form>
            </section>
          </main>
        )
      } />
    </Routes>
  );
}

export default App;