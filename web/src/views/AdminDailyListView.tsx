import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Client, ClientRegistryEntry, Driver, ScheduleItem } from '../types';
import ScheduleCalendar from '../scheduleCalendar';
import ClientForm from '../components/ClientForm';
import { Users, Utensils, Truck, AlertTriangle, Trash2, MapPin, Phone, ChevronRight, CheckCircle2, XCircle, UserCircle } from 'lucide-react';

type ClientWithSchedule = Client & { nextVisitDate?: string | null };

type AdminDailyListViewProps = {
  totalClientsToday: number;
  totalPortionsToday: number;
  remainingDeliveriesToday: number;
  activeSosCount: number;
  scheduleItems: ScheduleItem[];
  clients: ClientWithSchedule[];
  drivers: Driver[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
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
  clientsLoading: boolean;
  clientDeletingId: string | null;
  onDeleteClient: (clientId: string) => void | Promise<void>;
  formatNextVisitDate: (value?: string | null) => string;
  renderLastCheckInStatus: (lastCheckIn: string | undefined) => ReactNode;
  onOpenSignaturePreview: (item: {
    name?: string;
    clientName?: string;
    clientSignature?: string | null;
    driverSignature?: string | null;
    lastCheckIn?: string | null;
  }) => void;
  onViewProfile: (entry: ClientRegistryEntry) => void; // Добавено за отваряне на профил
};

export default function AdminDailyListView({
  totalClientsToday, totalPortionsToday, remainingDeliveriesToday, activeSosCount,
  scheduleItems, clients, drivers, selectedDate, onDateChange,
  registrySearch, selectedRegistryEntryId, registrySuggestions,
  onRegistrySearchChange, onRegistrySelect, onRegistryClear,
  clientForm, onClientInputChange, driversLoading, clientSubmitting, clientsError,
  onSubmitClient, onAddForToday,
  clientsLoading, clientDeletingId, onDeleteClient,
  renderLastCheckInStatus, onOpenSignaturePreview,
  onViewProfile
}: AdminDailyListViewProps) {

  const getStatusBadge = (lastCheckIn: string | undefined) => {
    if (!lastCheckIn) return null;
    const normalized = lastCheckIn.toUpperCase();
    
    if (normalized.includes('INCIDENT') || normalized.includes('SOS')) {
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-red-600 ring-1 ring-red-200">
          <XCircle className="h-3.5 w-3.5" /> Проблем
        </div>
      );
    }
    
    if (normalized.includes('ДОСТАВЕНО')) {
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" /> Доставено
        </div>
      );
    }
    return null;
  };

  const formatReportText = (text: string) => {
    if (!text) return '';

    let formattedText = text
      .replace('INCIDENT:', 'СИГНАЛ ЗА ПРОБЛЕМ:')
      .replace('Доставено и подписано от двете страни', 'Успешно предадена и подписана храна');

    const isoMatch = formattedText.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
    
    if (isoMatch) {
      const dateStr = isoMatch[0];
      const dateObj = new Date(dateStr);
      
      if (!Number.isNaN(dateObj.getTime())) {
        const date = dateObj.toLocaleString('bg-BG', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        formattedText = formattedText.replace(dateStr, `(${date} ч.)`);
      }
    }

    return formattedText;
  };

  const getStatsDateLabel = (date: Date) => {
    const today = new Date();
    const isToday = 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return 'Днес';
    }
    
    return `за ${date.toLocaleDateString('bg-BG', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })}`;
  };

  const handleCardClick = (client: ClientWithSchedule) => {
  if (client.egn && onViewProfile) {
    const registryEntry: ClientRegistryEntry = {
      id: (client as any).clientId || client.id,
      name: client.name,
      egn: client.egn,
      address: client.address,
      phone: client.phone || '',
      defaultMealType: (client as any).mealType || '',
      defaultMealCount: Number((client as any).mealCount) || 1 
    };
    onViewProfile(registryEntry);
  }
};

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const filteredClientsForSelectedDate = useMemo(() => {
    return clients.filter(client => {
      return scheduleItems.some(item => {
        const itemDate = new Date(item.date);
        return isSameDay(itemDate, selectedDate) && item.clientId === client.id;
      });
    });
  }, [clients, scheduleItems, selectedDate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
     {/* 1. СТАТИСТИКА */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Клиенти', val: totalClientsToday, icon: <Users />, color: 'text-blue-500', bg: 'bg-blue-50/50', border: 'border-blue-100' },
          { label: 'Порции', val: totalPortionsToday, icon: <Utensils />, color: 'text-amber-500', bg: 'bg-amber-50/50', border: 'border-amber-100' },
          { label: 'Остават', val: remainingDeliveriesToday, icon: <Truck />, color: 'text-emerald-500', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
          { label: 'SOS Сигнали', val: activeSosCount, icon: <AlertTriangle />, color: 'text-red-500', bg: 'bg-red-50/50', border: 'border-red-100', pulse: activeSosCount > 0 },
        ].map((s, i) => (
          <div key={i} className={`rounded-[2rem] bg-white p-5 border ${s.border} shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-xl ${s.bg} ${s.color} ${s.pulse ? 'animate-pulse' : ''}`}>{s.icon}</div>
              {/* ТУК Е ПРОМЯНАТА: */}
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {getStatsDateLabel(selectedDate)}
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-slate-900">{s.val}</p>
            <p className="text-xs font-bold text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </section>

      {/* 2. РАБОТНА ПЛОЩ */}
      <section className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden h-fit lg:sticky lg:top-24">
          <ScheduleCalendar
            scheduleItems={scheduleItems}
            clients={clients}
            drivers={drivers}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
          />
        </div>

        <div className="h-full">
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
        </div>
      </section>

      {/* 3. СПИСЪК С КЛИЕНТИ */}
      <section className="space-y-6">
        <div className="px-4">
          <h3 className="text-xl font-black text-slate-900 leading-none">График за деня</h3>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-2">
            {selectedDate.toLocaleDateString('bg-BG', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {clientsLoading ? (
          <div className="py-20 text-center font-bold text-slate-400 animate-pulse uppercase text-xs tracking-widest">
            Обновяване на списъка...
          </div>
        ) : filteredClientsForSelectedDate.length === 0 ? (
          <div className="rounded-[3rem] bg-slate-100/50 border-2 border-dashed border-slate-200 p-16 text-center">
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Няма планирани доставки за тази дата</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
            {filteredClientsForSelectedDate.map(client => (
              <div 
                key={client.id} 
                onClick={() => handleCardClick(client)}
                className={`group relative flex flex-col rounded-[2.5rem] bg-white p-6 border border-slate-100 shadow-sm transition-all hover:shadow-md ${client.egn ? 'cursor-pointer hover:border-blue-400' : ''}`}
              >
                
                {/* Горна част на картата */}
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-14 w-14 flex-shrink-0 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-xl font-black text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                          {client.name}
                        </h4>
                        {client.egn && <UserCircle className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                        <Phone className="w-3 h-3" /> {client.phone} • ЕГН: {client.egn || '---'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDeleteClient(client.id);
                    }}
                    disabled={clientDeletingId === client.id}
                    className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Адрес */}
                <div className="mt-5 space-y-4">
                  <div className="flex flex-col gap-1 rounded-2xl bg-slate-50/50 p-4 border border-slate-50">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Адрес на доставка
                    </span>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">{client.address}</p>
                  </div>

                  {/* Статус и Детайли */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(client.lastCheckIn)}
                      <span className="rounded-lg border border-slate-100 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">
                        {client.mealCount}× {client.mealType}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {(client.driverSignature || client.clientSignature || client.lastSignature) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSignaturePreview({
                              name: client.name,
                              clientSignature: client.clientSignature || client.lastSignature || null,
                              driverSignature: client.driverSignature || null,
                              lastCheckIn: client.lastCheckIn || null
                            });
                          }}
                          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-600 transition-all shadow-sm"
                        >
                          Подпис <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {client.lastCheckIn && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-3 mt-2">
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">
                        {formatReportText(client.lastCheckIn)}
                      </p>
                    </div>
                  )}

                  {client.notes && (
                    <div className="rounded-xl bg-amber-50/50 p-3 border border-amber-100/50">
                      <p className="text-[11px] text-amber-700 font-bold italic">Бележка: {client.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}