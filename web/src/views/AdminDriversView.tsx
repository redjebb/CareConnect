import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Driver } from '../types';

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
  onViewProfile: (driver: any) => void; // Добавено правилно в типа
};

const DriverStatusBadge = ({ email, invitations }: { email: string; invitations: any[] }) => {
  const invite = invitations.find(i => i.email === email);

  if (!invite || invite.status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Активен
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Чака активация
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
  onViewProfile, // Вече е достъпно тук
}: AdminDriversViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDrivers = drivers
    .filter(driver =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {/* ФОРМА ЗА ДОБАВЯНЕ */}
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow h-fit">
        <h2 className="text-xl font-semibold text-slate-900">Добави шофьор</h2>
        <p className="mt-1 text-sm text-slate-500">Попълнете детайли за нов шофьор.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Име</label>
            <input
              type="text"
              value={driverForm.name}
              onChange={event => onDriverInputChange('name', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Петър Петров"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Имейл</label>
            <input
              type="email"
              value={driverForm.email}
              onChange={event => onDriverInputChange('email', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="driver@careconnect.bg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Телефон</label>
            <input
              type="tel"
              value={driverForm.phone}
              onChange={event => onDriverInputChange('phone', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="+359 88 123 4567"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Град</label>
            <select
              value={driverForm.selectedCity}
              onChange={event => onDriverCityChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            >
              <option value="">Изберете град</option>
              {Object.keys(cityData).map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Район</label>
            <select
              value={driverForm.routeArea}
              onChange={event => onDriverInputChange('routeArea', event.target.value)}
              disabled={!driverForm.selectedCity}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
              required
            >
              <option value="">
                {driverForm.selectedCity ? 'Изберете район' : 'Моля, изберете град'}
              </option>
              {(cityData[driverForm.selectedCity] ?? []).map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={driverSubmitting}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60 transition-colors"
        >
          {driverSubmitting ? 'Добавяне...' : 'Запази шофьор'}
        </button>
        {driversError ? <p className="mt-3 text-sm text-red-600 font-medium">{driversError}</p> : null}
      </form>

      {/* СПИСЪК С ШОФЬОРИ */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Списък с шофьори</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {filteredDrivers.length}
            </span>
          </div>
          <div className="relative">
             <input 
               type="text"
               placeholder="Търси име или имейл..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full sm:w-64 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
             />
          </div>
        </div>

        {driversLoading ? (
          <p className="mt-6 text-sm text-slate-500 italic text-center">Зареждане на списъка...</p>
        ) : filteredDrivers.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500 italic">
              {searchTerm ? 'Няма намерени шофьори.' : 'Няма добавени шофьори.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 font-bold italic">Име</th>
                  <th className="px-4 py-3 font-bold italic text-center">Статус</th>
                  <th className="px-4 py-3 font-bold italic text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.map(driver => (
                  <tr key={driver.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{driver.name}</div>
                      <div className="text-[11px] text-slate-400">{driver.routeArea}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <DriverStatusBadge email={driver.email} invitations={invitations} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* БУТОН ЗА ПРОФИЛ */}
                        <button
                          type="button"
                          onClick={() => onViewProfile(driver)}
                          className="rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                        >
                          ПРОФИЛ
                        </button>

                        {/* БУТОН ЗА ИЗТРИВАНЕ */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Сигурни ли сте, че искате да изтриете ${driver.name}?`)) {
                              onDeleteDriver(driver.id);
                            }
                          }}
                          disabled={driverDeletingId === driver.id}
                          className="rounded-md border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-60"
                        >
                          {driverDeletingId === driver.id ? '...' : 'Изтрий'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}