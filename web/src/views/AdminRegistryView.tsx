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
  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold text-slate-900">Регистър (Картотека)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Добавяйте хора веднъж и ги използвайте в дневния списък.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">ЕГН</label>
            <input
              type="text"
              value={registryForm.egn}
              onChange={event => onRegistryInputChange('egn', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="1234567890"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Име</label>
            <input
              type="text"
              value={registryForm.name}
              onChange={event => onRegistryInputChange('name', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Мария Иванова"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Телефон</label>
            <input
              type="tel"
              value={registryForm.phone}
              onChange={event => onRegistryInputChange('phone', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="+359 88 123 4567"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-slate-700">Адрес</label>
            <input
              type="text"
              value={registryForm.address}
              onChange={event => onRegistryInputChange('address', event.target.value)}
              onFocus={() => onShowRegistryAddressSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => onShowRegistryAddressSuggestions(false), 150);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="ул. „Шипка“ 15, София"
            />

            {showRegistryAddressSuggestions && registryAddressSuggestions.length > 0 ? (
              <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {registryAddressSuggestions.map(suggestion => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => onSelectRegistryAddressSuggestion(suggestion)}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Вид меню (по подразбиране)</label>
              <select
                value={registryForm.defaultMealType}
                onChange={event => onRegistryInputChange('defaultMealType', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              >
                <option value="Стандартно меню">Стандартно меню</option>
                <option value="Диетично меню">Диетично меню</option>
                <option value="Вегетарианско">Вегетарианско</option>
                <option value="Само хляб">Само хляб</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Брой порции (по подразбиране)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={registryForm.defaultMealCount}
                onChange={event => onRegistryInputChange('defaultMealCount', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="submit"
            disabled={registrySubmitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
          >
            {registrySubmitting
              ? registryEditingId
                ? 'Записване...'
                : 'Добавяне...'
              : registryEditingId
                ? 'Запази промени'
                : 'Добави в регистъра'}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Откажи
          </button>
        </div>

        {registryError ? <p className="mt-3 text-sm text-red-600">{registryError}</p> : null}
      </form>

      <RegistryTable
        entries={entries}
        isLoading={registryLoading}
        deletingId={registryDeletingId}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewProfile={onViewProfile}
      />
    </section>
  );
}
