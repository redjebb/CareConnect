import type { ReactNode } from 'react';
import type { Client, ClientRegistryEntry, Driver, ScheduleItem } from '../types';
import ScheduleCalendar from '../scheduleCalendar';
import ClientForm from '../components/ClientForm';

type ClientWithSchedule = Client & { nextVisitDate?: string | null };

type AdminDailyListViewProps = {
  // stats
  totalClientsToday: number;
  totalPortionsToday: number;
  remainingDeliveriesToday: number;
  activeSosCount: number;

  // profile quick search (inside daily view)
  profileSearch: string;
  setProfileSearch: (value: string) => void;
  isProfileSearchOpen: boolean;
  setIsProfileSearchOpen: (value: boolean) => void;
  profileSearchResults: ClientRegistryEntry[];
  onSelectProfileSearch: (entry: ClientRegistryEntry) => void;

  // calendar
  scheduleItems: ScheduleItem[];
  clients: ClientWithSchedule[];
  drivers: Driver[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;

  // client form
  registrySearch: string;
  selectedRegistryEntryId: string | null;
  registrySuggestions: ClientRegistryEntry[];
  onRegistrySearchChange: (value: string) => void;
  onRegistrySelect: (entry: ClientRegistryEntry) => void;
  onRegistryClear: () => void;

  clientForm: {
    egn: string;
    name: string;
    address: string;
    phone: string;
    notes: string;
    assignedDriverId: string;
    serviceDate: string;
    mealType: string;
    mealCount: string;
  };
  onClientInputChange: (field: keyof AdminDailyListViewProps['clientForm'], value: string) => void;

  driversLoading: boolean;
  clientSubmitting: boolean;
  clientsError: string | null;
  onSubmitClient: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onAddForToday: () => void | Promise<void>;

  // table + actions
  clientsLoading: boolean;
  clientDeletingId: string | null;
  reportGenerating: boolean;
  onGenerateMonthlyReport: () => void | Promise<void>;
  onDeleteClient: (clientId: string) => void | Promise<void>;

  // helpers
  formatNextVisitDate: (value?: string | null) => string;
  renderLastCheckInStatus: (lastCheckIn: string | undefined) => ReactNode;
  onOpenSignaturePreview: (driverUrl: string | null, clientUrl: string | null) => void;
};

export default function AdminDailyListView({
  totalClientsToday,
  totalPortionsToday,
  remainingDeliveriesToday,
  activeSosCount,

  profileSearch,
  setProfileSearch,
  isProfileSearchOpen,
  setIsProfileSearchOpen,
  profileSearchResults,
  onSelectProfileSearch,

  scheduleItems,
  clients,
  drivers,
  selectedDate,
  onDateChange,

  registrySearch,
  selectedRegistryEntryId,
  registrySuggestions,
  onRegistrySearchChange,
  onRegistrySelect,
  onRegistryClear,

  clientForm,
  onClientInputChange,
  driversLoading,
  clientSubmitting,
  clientsError,
  onSubmitClient,
  onAddForToday,

  clientsLoading,
  clientDeletingId,
  reportGenerating,
  onGenerateMonthlyReport,
  onDeleteClient,

  formatNextVisitDate,
  renderLastCheckInStatus,
  onOpenSignaturePreview
}: AdminDailyListViewProps) {
  return (
    <section className="space-y-6">
      {/* Stats + quick profile search */}
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600">Общо клиенти</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{totalClientsToday}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">За днес (по график)</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600">Общо порции храна</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{totalPortionsToday}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v20" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 11h2a3 3 0 003-3V2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 2v6a3 3 0 003 3h2V2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 2v20" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Сума от порциите за днес</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600">Остават за доставка</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{remainingDeliveriesToday}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13v10H3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 10h4l1 2v5h-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17a2 2 0 104 0" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17a2 2 0 104 0" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Без отчет или подпис</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600">Активни SOS сигнали</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{activeSosCount}</p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
                  activeSosCount > 0
                    ? 'bg-red-50 text-red-600 ring-red-100 animate-pulse'
                    : 'bg-red-50 text-red-600 ring-red-100'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Ескалирани / SOS (незатворени)</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <label className="text-sm font-semibold text-slate-700">
            Бързо търсене на профил (Име или ЕГН)
          </label>
          <div className="relative mt-3">
            <input
              type="text"
              value={profileSearch}
              onChange={event => {
                setProfileSearch(event.target.value);
                setIsProfileSearchOpen(true);
              }}
              onFocus={() => setIsProfileSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setIsProfileSearchOpen(false), 150);
              }}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Например: Мария Иванова или 1234567890"
            />

            {isProfileSearchOpen && profileSearchResults.length > 0 ? (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {profileSearchResults.map(entry => (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => onSelectProfileSearch(entry)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">{entry.name}</span>
                    <span className="text-xs text-slate-500">{entry.egn}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {isProfileSearchOpen && profileSearch.trim() && profileSearchResults.length === 0 ? (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
                Няма намерени резултати.
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-slate-500">Търсете по име или ЕГН от регистъра.</p>
        </div>
      </section>

      {/* Calendar + form + table */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <ScheduleCalendar
          scheduleItems={scheduleItems}
          clients={clients}
          drivers={drivers}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />

        <div className="space-y-6">
          <ClientForm
            registrySearch={registrySearch}
            selectedRegistryEntryId={selectedRegistryEntryId}
            registrySuggestions={registrySuggestions}
            onRegistrySearchChange={onRegistrySearchChange}
            onRegistrySelect={onRegistrySelect}
            onRegistryClear={onRegistryClear}
            clientForm={clientForm}
            onClientInputChange={onClientInputChange}
            drivers={drivers}
            driversLoading={driversLoading}
            clientSubmitting={clientSubmitting}
            clientsError={clientsError}
            onSubmit={onSubmitClient}
            onAddForToday={onAddForToday}
          />

          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Списък с клиенти</h2>
              <div className="flex items-center gap-3">
                {clientsLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
                <button
                  type="button"
                  onClick={() => void onGenerateMonthlyReport()}
                  disabled={reportGenerating}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-500 disabled:opacity-60"
                >
                  {reportGenerating ? 'Генериране...' : 'Генерирай Месечен Отчет (HTML/PDF)'}
                </button>
              </div>
            </div>

            {clientsLoading ? (
              <p className="mt-6 text-sm text-slate-500">Loading clients...</p>
            ) : clients.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">Няма налични клиенти.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-2 font-medium">ЕГН</th>
                      <th className="px-4 py-2 font-medium">Име</th>
                      <th className="px-4 py-2 font-medium">Адрес</th>
                      <th className="px-4 py-2 font-medium">Телефон</th>
                      <th className="px-4 py-2 font-medium">Меню / Порции</th>
                      <th className="px-4 py-2 font-medium">Бележки</th>
                      <th className="px-4 py-2 font-medium">Дата на посещение</th>
                      <th className="px-4 py-2 font-medium">Последен Отчет</th>
                      <th className="px-4 py-2 font-medium text-right">Действие</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {clients.map(client => (
                      <tr key={client.id}>
                        <td className="px-4 py-3 text-slate-600">{client.egn ?? ''}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
                        <td className="px-4 py-3 text-slate-600">{client.address}</td>
                        <td className="px-4 py-3 text-slate-600">{client.phone}</td>

                        <td className="px-4 py-3 text-slate-600">
                          <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-300">
                            <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
                            {client.mealType && client.mealCount
                              ? `${client.mealCount}× ${client.mealType}`
                              : 'Не е зададено'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-600">{client.notes}</td>
                        <td className="px-4 py-3 text-slate-600">{formatNextVisitDate(client.nextVisitDate)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {renderLastCheckInStatus(client.lastCheckIn)}
                            {client.driverSignature || client.clientSignature || client.lastSignature ? (
                              <button
                                type="button"
                                title="Виж подпис"
                                onClick={() =>
                                  onOpenSignaturePreview(
                                    client.driverSignature ?? null,
                                    client.clientSignature ?? client.lastSignature ?? null
                                  )
                                }
                                className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                              >
                                ✍️ Подпис
                              </button>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void onDeleteClient(client.id)}
                            disabled={clientDeletingId === client.id}
                            className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            {clientDeletingId === client.id ? 'Изтриване...' : 'Изтрий'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
