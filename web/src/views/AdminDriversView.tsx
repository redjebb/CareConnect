import type { FormEvent } from 'react';
import type { Driver } from '../types';

type AdminDriversViewProps = {
  cityData: Record<string, string[]>;

  drivers: Driver[];
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
};

export default function AdminDriversView({
  cityData,
  drivers,
  driversLoading,
  driversError,
  driverSubmitting,
  driverDeletingId,
  driverForm,
  onDriverInputChange,
  onDriverCityChange,
  onSubmit,
  onDeleteDriver
}: AdminDriversViewProps) {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow">
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
                <option key={city} value={city}>
                  {city}
                </option>
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
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={driverSubmitting}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
        >
          {driverSubmitting ? 'Добавяне...' : 'Запази шофьор'}
        </button>
        {driversError ? <p className="mt-3 text-sm text-red-600">{driversError}</p> : null}
      </form>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Списък с шофьори</h2>
          {driversLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
        </div>

        {driversLoading ? (
          <p className="mt-6 text-sm text-slate-500">Loading drivers...</p>
        ) : drivers.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Няма налични шофьори.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-2 font-medium">Име</th>
                  <th className="px-4 py-2 font-medium">Имейл</th>
                  <th className="px-4 py-2 font-medium">Телефон</th>
                  <th className="px-4 py-2 font-medium">Район</th>
                  <th className="px-4 py-2 font-medium text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map(driver => (
                  <tr key={driver.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{driver.name}</td>
                    <td className="px-4 py-3 text-slate-600">{driver.email}</td>
                    <td className="px-4 py-3 text-slate-600">{driver.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{driver.routeArea}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteDriver(driver.id)}
                        disabled={driverDeletingId === driver.id}
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {driverDeletingId === driver.id ? 'Изтриване...' : 'Изтрий'}
                      </button>
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
