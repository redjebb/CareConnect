import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { ClientRegistryEntry } from '../types';
import RegistryTable from '../components/RegistryTable';
import { UserPlus, Search, ShieldCheck, MapPin, Phone, Database, User, X, Check } from 'lucide-react';

type RegistryFormState = {
  egn: string;
  name: string;
  address: string;
  phone: string;
  defaultMealType: string;
  defaultMealCount: string;
};

type AdminRegistryViewProps = {
  registryForm: RegistryFormState;
  registryEditingId: string | null;
  registrySubmitting: boolean;
  registryError: string | null;
  entries: ClientRegistryEntry[];
  registryLoading: boolean;
  registryDeletingId: string | null;
  registryAddressSuggestions: string[];
  showRegistryAddressSuggestions: boolean;
  onShowRegistryAddressSuggestions: (next: boolean) => void;
  onSelectRegistryAddressSuggestion: (suggestion: string) => void;
  onRegistryInputChange: (field: keyof RegistryFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onReset: () => void;
  onEdit: (entry: ClientRegistryEntry) => void;
  onDelete: (entryId: string) => void | Promise<void>;
  onViewProfile: (entry: ClientRegistryEntry) => void;
};

export default function AdminRegistryView({
  registryForm,
  registryEditingId,
  registrySubmitting,
  registryError,
  entries,
  registryLoading,
  registryDeletingId,
  registryAddressSuggestions,
  showRegistryAddressSuggestions,
  onShowRegistryAddressSuggestions,
  onSelectRegistryAddressSuggestion,
  onRegistryInputChange,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
  onViewProfile
}: AdminRegistryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = useMemo(() => {
    return (entries || [])
      .filter(entry => {
        const search = searchTerm.toLowerCase();
        return (
          (entry.name || '').toLowerCase().includes(search) ||
          (entry.egn || '').includes(search) ||
          (entry.address || '').toLowerCase().includes(search)
        );
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bg'));
  }, [entries, searchTerm]);

  const handleNameChange = (val: string) => {
    const formatted = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    onRegistryInputChange('name', formatted);
  };

  const inputClasses = "mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400";
  const labelClasses = "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1";

  return (
    <section className="grid gap-8 lg:grid-cols-[400px_1fr] items-start">
      {/* ЛЯВА КОЛОНА: ФОРМА ЗА РЕДАКЦИЯ/ДОБАВЯНЕ */}
      <aside className="sticky top-24">
        <form onSubmit={onSubmit} className="overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/60">
          <div className={`p-6 border-b ${registryEditingId ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              {registryEditingId ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-amber-600" /> Редактиране на клиент
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-blue-600" /> Нов запис в регистър
                </>
              )}
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Постоянни данни на клиента в системата</p>
          </div>

          <div className="p-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className={labelClasses}>ЕГН / Идентификатор</label>
                <input
                  type="text"
                  maxLength={10}
                  value={registryForm.egn}
                  onChange={e => onRegistryInputChange('egn', e.target.value)}
                  className={inputClasses}
                  placeholder="0000000000"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className={labelClasses}><Phone className="w-3 h-3" /> Телефон</label>
                <input
                  type="tel"
                  value={registryForm.phone}
                  onChange={e => onRegistryInputChange('phone', e.target.value)}
                  className={inputClasses}
                  placeholder="08..."
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}><User className="w-3 h-3" /> Пълно име</label>
              <input
                type="text"
                value={registryForm.name}
                onChange={e => handleNameChange(e.target.value)}
                className={inputClasses}
                placeholder="Име и Фамилия"
                required
              />
            </div>

            <div className="relative">
              <label className={labelClasses}><MapPin className="w-3 h-3" /> Постоянен адрес</label>
              <input
                type="text"
                value={registryForm.address}
                onChange={e => onRegistryInputChange('address', e.target.value)}
                onFocus={() => onShowRegistryAddressSuggestions(true)}
                className={inputClasses}
                placeholder="Град, улица, номер..."
                required
              />
              {showRegistryAddressSuggestions && registryAddressSuggestions.length > 0 && (
                <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95">
                  {registryAddressSuggestions.map(s => (
                    <li key={s}>
                      <button 
                        type="button" 
                        onClick={() => onSelectRegistryAddressSuggestion(s)} 
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-blue-50 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
               <button 
                  type="submit" 
                  disabled={registrySubmitting} 
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                    registryEditingId ? 'bg-amber-500 shadow-amber-200 hover:bg-amber-600' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700'
                  }`}
               >
                 {registryEditingId ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                 {registryEditingId ? 'Запази' : 'Добави'}
               </button>
               <button 
                  type="button" 
                  onClick={onReset} 
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
               >
                 Откажи
               </button>
            </div>
          </div>
          
          {registryError && (
            <div className="px-6 pb-6 animate-in slide-in-from-top-2">
              <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-bold text-red-600 border border-red-100">
                {registryError}
              </p>
            </div>
          )}
        </form>
      </aside>

      {/* ДЯСНА КОЛОНА: СПИСЪК КЛИЕНТИ */}
      <main className="space-y-6">
        <div className="rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-sm">
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
                <Database className="w-6 h-6 text-blue-600" /> Централен регистър
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Управление на всички клиенти в CareConnect</p>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text"
                placeholder="Бързо филтриране..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg bg-white px-2 py-0.5 text-[10px] font-black text-slate-400 border border-slate-100 shadow-sm">
                {filteredEntries.length}
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-inner bg-slate-50/30">
            <RegistryTable
              entries={filteredEntries}
              isLoading={registryLoading}
              deletingId={registryDeletingId}
              onEdit={onEdit}
              onDelete={(id) => {
                if (window.confirm('Сигурни ли сте, че искате да премахнете този клиент от картотеката за постоянно?')) onDelete(id);
              }}
              onViewProfile={onViewProfile}
            />
          </div>
          
          {!registryLoading && filteredEntries.length === 0 && (
            <div className="py-20 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-bold">Няма намерени клиенти</h3>
              <p className="text-slate-500 text-sm">Променете критериите за търсене или добавете нов клиент.</p>
            </div>
          )}
        </div>
      </main>
    </section>
  );
}