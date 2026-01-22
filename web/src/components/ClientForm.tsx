import { FormEvent, useEffect, useState } from 'react';
import { ClientRegistryEntry, Driver } from '../types';

interface ArcGisSuggestion {
  text?: string;
}

const fetchArcGisSuggestions = async (query: string) => {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=${encodeURIComponent(
    query
  )}&f=json&countryCode=BGR&maxSuggestions=5`;

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { suggestions?: ArcGisSuggestion[] };
  const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
  return suggestions
    .map(item => item.text?.trim() ?? '')
    .filter(Boolean)
    .slice(0, 5);
};

interface ClientFormState {
  egn: string;
  name: string;
  address: string;
  phone: string;
  notes: string;
  assignedDriverId: string;
  serviceDate: string;
  mealType: string;
  mealCount: string;
}

interface ClientFormProps {
  registrySearch: string;
  selectedRegistryEntryId: string | null;
  registrySuggestions: ClientRegistryEntry[];
  onRegistrySearchChange: (value: string) => void;
  onRegistrySelect: (entry: ClientRegistryEntry) => void;
  onRegistryClear: () => void;

  clientForm: ClientFormState;
  onClientInputChange: (field: keyof ClientFormState, value: string) => void;

  drivers: Driver[];
  driversLoading: boolean;

  clientSubmitting: boolean;
  clientsError: string | null;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAddForToday: () => void;
}

export default function ClientForm({
  registrySearch,
  selectedRegistryEntryId,
  registrySuggestions,
  onRegistrySearchChange,
  onRegistrySelect,
  onRegistryClear,
  clientForm,
  onClientInputChange,
  drivers,
  driversLoading,
  clientSubmitting,
  clientsError,
  onSubmit,
  onAddForToday
}: ClientFormProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [addressWarning, setAddressWarning] = useState<string | null>(null);
  const [addressHighlight, setAddressHighlight] = useState(false);

  useEffect(() => {
    const query = clientForm.address.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    const debounce = window.setTimeout(() => {
      void (async () => {
        try {
          const suggestions = await fetchArcGisSuggestions(query);
          setAddressSuggestions(suggestions);
          setShowAddressSuggestions(true);
        } catch (error) {
          console.error('Failed to fetch address suggestions.', error);
          setAddressSuggestions([]);
        }
      })();
    }, 350);

    return () => {
      window.clearTimeout(debounce);
    };
  }, [clientForm.address]);

  const handleSelectAddress = (suggestion: string) => {
    onClientInputChange('address', suggestion);
    setSelectedAddress(suggestion);
    setIsAddressVerified(true);
    setAddressWarning(null);
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setAddressHighlight(true);
    window.setTimeout(() => setAddressHighlight(false), 900);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!isAddressVerified) {
      event.preventDefault();
      setAddressWarning('Моля, изберете валиден адрес от предложенията.');
      return;
    }
    onSubmit(event);
  };

  const handleAddForTodayClick = () => {
    if (!isAddressVerified) {
      setAddressWarning('Моля, изберете валиден адрес от предложенията.');
      return;
    }
    onAddForToday();
  };

  return (
    <form onSubmit={handleFormSubmit} className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-xl font-semibold text-slate-900">Добави клиент</h2>
      <p className="mt-1 text-sm text-slate-500">Търсете в картотеката или попълнете ръчно за нов клиент</p>
      <div className="mt-6 space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700">Търсене в Регистъра</label>
          <input
            type="text"
            value={registrySearch}
            onChange={event => {
              onRegistrySearchChange(event.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Търсене по ЕГН или име"
          />
          {registrySearch.trim() && registrySuggestions.length > 0 ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
              {registrySuggestions.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onRegistrySelect(entry)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{entry.name || 'Без име'}</span>
                  <span className="text-slate-500">{entry.egn}</span>
                </button>
              ))}
            </div>
          ) : null}
          {selectedRegistryEntryId ? (
            <button
              type="button"
              onClick={onRegistryClear}
              className="mt-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Изчисти избора
            </button>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Име</label>
          <input
            type="text"
            value={clientForm.name}
            onChange={event => onClientInputChange('name', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="Мария Иванова"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">ЕГН</label>
          <input
            type="text"
            value={clientForm.egn}
            onChange={event => onClientInputChange('egn', event.target.value)}
            readOnly={!!selectedRegistryEntryId}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50"
            placeholder="(по избор)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Телефон</label>
          <input
            type="tel"
            value={clientForm.phone}
            onChange={event => onClientInputChange('phone', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="+359 88 123 4567"
            required
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700">Адрес</label>
          <input
            type="text"
            value={clientForm.address}
            onChange={event => {
              onClientInputChange('address', event.target.value);
              setSelectedAddress(null);
              setIsAddressVerified(false);
              setAddressWarning(null);
            }}
            onFocus={() => setShowAddressSuggestions(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setShowAddressSuggestions(false);
                const normalized = clientForm.address.trim();
                if (!normalized) {
                  setAddressWarning(null);
                  return;
                }
                if (!selectedAddress || normalized !== selectedAddress) {
                  onClientInputChange('address', '');
                  setSelectedAddress(null);
                  setIsAddressVerified(false);
                  setAddressWarning('Моля, изберете валиден адрес от предложенията.');
                }
              }, 150);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && addressSuggestions.length > 0) {
                event.preventDefault();
                handleSelectAddress(addressSuggestions[0]);
              }
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="ул. „Шипка“ 15, София"
            required
          />
          {addressHighlight ? (
            <div className="pointer-events-none absolute inset-x-0 top-8 h-10 rounded-lg ring-2 ring-emerald-400/60" />
          ) : null}
          {showAddressSuggestions && addressSuggestions.length > 0 ? (
            <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              {addressSuggestions.map(suggestion => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      handleSelectAddress(suggestion);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {addressWarning ? <p className="mt-2 text-xs font-semibold text-amber-600">{addressWarning}</p> : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Дата на посещение</label>
          <input
            type="date"
            value={clientForm.serviceDate}
            onChange={event => onClientInputChange('serviceDate', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Вид меню</label>
            <select
              value={clientForm.mealType}
              onChange={event => onClientInputChange('mealType', event.target.value)}
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
            <label className="block text-sm font-medium text-slate-700">Брой порции</label>
            <input
              type="number"
              min={1}
              step={1}
              value={clientForm.mealCount}
              onChange={event => onClientInputChange('mealCount', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Бележки (диета, мобилност)</label>
          <textarea
            value={clientForm.notes}
            onChange={event => onClientInputChange('notes', event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            rows={3}
            placeholder="Без глутен, нужда от помощ при придвижване"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Назначи шофьор</label>
          <select
            value={clientForm.assignedDriverId}
            onChange={event => onClientInputChange('assignedDriverId', event.target.value)}
            disabled={driversLoading || drivers.length === 0}
            className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Изберете наличен шофьор</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name} — {driver.routeArea}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAddForTodayClick}
          disabled={clientSubmitting}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
        >
          {clientSubmitting ? 'Добавяне...' : 'Добави за днес'}
        </button>
        <button
          type="submit"
          disabled={clientSubmitting}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {clientSubmitting ? 'Записване...' : 'Запази (по избрана дата)'}
        </button>
      </div>

      {clientsError ? <p className="mt-3 text-sm text-red-600">{clientsError}</p> : null}
    </form>
  );
}
