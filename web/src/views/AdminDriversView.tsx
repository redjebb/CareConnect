import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Driver } from '../types';
import { UserPlus, Search, Truck, MapPin, Phone, Mail, Trash2, UserCircle, CheckCircle2, Clock, Map, ChevronRight } from 'lucide-react';

type AdminDriversViewProps = {
  cityData: Record<string, string[]>;
  drivers: Driver[];
  invitations: any[];
  driversLoading: boolean;
  driversError: string | null;
  driverSubmitting: boolean;
  driverDeletingId: string | null;
  driverForm: {
    name: string;
    email: string;
    phone: string;
    routeArea: string;
    selectedCity: string;
  };
  onDriverInputChange: (field: 'name' | 'email' | 'phone' | 'routeArea', value: string) => void;
  onDriverCityChange: (city: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteDriver: (driverId: string) => void;
  onViewProfile: (driver: any) => void;
};

const DriverStatusBadge = ({ email, invitations }: { email: string; invitations: any[] }) => {
  const invite = invitations.find(i => i.email === email);

  if (!invite || invite.status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Активен
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 ring-1 ring-amber-200">
      <Clock className="h-3 w-3" /> Чака активация
    </span>
  );
};

export default function AdminDriversView({
  cityData,
  drivers,
  invitations,
  driversLoading,
  driversError,
  driverSubmitting,
  driverDeletingId,
  driverForm,
  onDriverInputChange,
  onDriverCityChange,
  onSubmit,
  onDeleteDriver,
  onViewProfile,
}: AdminDriversViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDrivers = drivers
    .filter(driver =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));

  const inputClasses = "mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400";
  const labelClasses = "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1";

  return (
    <section className="grid gap-8 lg:grid-cols-[400px_1fr] items-start">
      {/* ФОРМА ЗА ДОБАВЯНЕ */}
      <aside className="lg:sticky lg:top-24">
        <form onSubmit={onSubmit} className="overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/60">
          <div className="bg-slate-50 p-6 border-b border-slate-100">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <UserPlus className="w-5 h-5 text-blue-600" /> Добави шофьор
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-tight">Нов член на екипа</p>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}><UserCircle className="w-3 h-3" /> Име на шофьора</label>
              <input
                type="text"
                value={driverForm.name}
                onChange={event => onDriverInputChange('name', event.target.value)}
                className={inputClasses}
                placeholder="Петър Петров"
                required
              />
            </div>

            <div>
              <label className={labelClasses}><Mail className="w-3 h-3" /> Служебен Имейл</label>
              <input
                type="email"
                value={driverForm.email}
                onChange={event => onDriverInputChange('email', event.target.value)}
                className={inputClasses}
                placeholder="driver@careconnect.bg"
                required
              />
            </div>

            <div>
              <label className={labelClasses}><Phone className="w-3 h-3" /> Телефон</label>
              <input
                type="tel"
                value={driverForm.phone}
                onChange={event => onDriverInputChange('phone', event.target.value)}
                className={inputClasses}
                placeholder="+359..."
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClasses}><MapPin className="w-3 h-3" /> Град</label>
                <select
                  value={driverForm.selectedCity}
                  onChange={event => onDriverCityChange(event.target.value)}
                  className={inputClasses}
                  required
                >
                  <option value="">Избор...</option>
                  {Object.keys(cityData).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClasses}><Map className="w-3 h-3" /> Район</label>
                <select
                  value={driverForm.routeArea}
                  onChange={event => onDriverInputChange('routeArea', event.target.value)}
                  disabled={!driverForm.selectedCity}
                  className={inputClasses}
                  required
                >
                  <option value="">{driverForm.selectedCity ? 'Избор...' : 'Град?'}</option>
                  {(cityData[driverForm.selectedCity] ?? []).map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={driverSubmitting}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              {driverSubmitting ? 'Добавяне...' : 'Запази шофьор'}
            </button>
            
            {driversError && (
              <p className="mt-2 text-center text-xs font-bold text-red-500 bg-red-50 py-2 rounded-xl border border-red-100">
                {driversError}
              </p>
            )}
          </div>
        </form>
      </aside>

      {/* СПИСЪК С ШОФЬОРИ */}
      <main className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              Шофьори <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-2xl text-sm">{filteredDrivers.length}</span>
            </h2>
            <p className="text-sm font-medium text-slate-500">Управление на екипа по логистика</p>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Търси име или имейл..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
            />
          </div>
        </div>

        {driversLoading ? (
          <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase text-xs tracking-widest">
            Зареждане на екипа...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="rounded-[2.5rem] bg-slate-100/50 p-20 text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Няма намерени шофьори</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
            {filteredDrivers.map(driver => (
              <div 
                key={driver.id} 
                onClick={() => onViewProfile(driver)}
                className="group relative cursor-pointer rounded-[2rem] bg-white p-6 border border-slate-100 shadow-sm hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl font-black text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <Truck className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                        {driver.name}
                      </h4>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <Mail className="w-3 h-3" /> {driver.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <Phone className="w-3 h-3" /> {driver.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Спира отварянето на профила при натискане на изтрий
                      if (window.confirm(`Сигурни ли сте, че искате да изтриете ${driver.name}?`)) {
                        onDeleteDriver(driver.id);
                      }
                    }}
                    disabled={driverDeletingId === driver.id}
                    className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-5">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Основен Район</span>
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-500" /> {driver.routeArea}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <DriverStatusBadge email={driver.email} invitations={invitations} />
                    <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200 group-hover:bg-blue-600 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </section>
  );
}