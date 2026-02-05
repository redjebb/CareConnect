import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { ClientRegistryEntry } from '../types';
import RegistryTable from '../components/RegistryTable';

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

  // Филтриране и Сортиране
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
    const formatted = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    onRegistryInputChange('name', formatted);
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      {/* ФОРМА */}
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow h-fit sticky top-6">
        <h2 className="text-xl font-semibold text-slate-900">Картотека</h2>
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">ЕГН</label>
              <input
                type="text"
                value={registryForm.egn}
                onChange={e => onRegistryInputChange('egn', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Телефон</label>
              <input
                type="tel"
                value={registryForm.phone}
                onChange={e => onRegistryInputChange('phone', e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Име</label>
            <input
              type="text"
              value={registryForm.name}
              onChange={e => handleNameChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2"
              required
            />
          </div>
          {/* Адрес и Меню - същите като в твоя код... */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700">Адрес</label>
            <input
              type="text"
              value={registryForm.address}
              onChange={e => onRegistryInputChange('address', e.target.value)}
              onFocus={() => onShowRegistryAddressSuggestions(true)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2"
              required
            />
             {showRegistryAddressSuggestions && registryAddressSuggestions.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-xl">
                {registryAddressSuggestions.map(s => (
                  <li key={s}><button type="button" onClick={() => onSelectRegistryAddressSuggestion(s)} className="w-full px-4 py-2 text-left hover:bg-blue-50">{s}</button></li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="submit" disabled={registrySubmitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-white font-bold">
              {registryEditingId ? 'Запази' : 'Добави'}
            </button>
            <button type="button" onClick={onReset} className="rounded-lg border px-4 py-2">Откажи</button>
          </div>
        </div>
      </form>

      {/* ТАБЛИЦА */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Клиенти</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {filteredEntries.length}
            </span>
          </div>
          <input 
            type="text"
            placeholder="Търси име, ЕГН, адрес..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 rounded-xl bg-slate-50 border px-4 py-2 text-sm"
          />
        </div>

        <RegistryTable
          entries={filteredEntries}
          isLoading={registryLoading}
          deletingId={registryDeletingId}
          onEdit={onEdit}
          onDelete={(id) => {
            if (window.confirm('Изтриване на клиент от картотеката?')) onDelete(id);
          }}
          onViewProfile={onViewProfile}
        />
      </div>
    </section>
  );
}