import { FormEvent, useEffect, useState } from 'react';
import { ClientRegistryEntry, Driver } from '../types';
import { Search, MapPin, User, Phone, Calendar, Utensils, ClipboardList, Truck, X } from 'lucide-react';

interface ArcGisSuggestion {
  text?: string;
}

// 1. Модифицирана функция за предложения с фокус върху основните градове
const fetchArcGisSuggestions = async (query: string) => {
  // Увеличаваме maxSuggestions на 15, за да имаме повече материал за филтриране
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?text=${encodeURIComponent(
    query
  )}&f=json&countryCode=BGR&maxSuggestions=15`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const payload = (await response.json()) as { suggestions?: ArcGisSuggestion[] };
  const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
  
  const mapped = suggestions.map(item => item.text?.trim() ?? '').filter(Boolean);

  // СТРИКТНО ФИЛТРИРАНЕ: Оставяме САМО адреси, които съдържат някой от градовете
  const allowedCities = ['софия', 'пловдив', 'варна', 'sofia', 'plovdiv', 'varna'];
  
  const filtered = mapped.filter(address => {
    const lowerAddress = address.toLowerCase();
    return allowedCities.some(city => lowerAddress.includes(city));
  });

  // Допълнително сортиране, за да е сигурно, че ако потребителят е започнал с името на града, той е най-отгоре
  return filtered.sort((a, b) => {
    // Ако адресът започва с града, дай му предимство
    const aStartsWithCity = allowedCities.some(city => a.toLowerCase().startsWith(city));
    const bStartsWithCity = allowedCities.some(city => b.toLowerCase().startsWith(city));
    if (aStartsWithCity && !bStartsWithCity) return -1;
    if (!aStartsWithCity && bStartsWithCity) return 1;
    return 0;
  }).slice(0, 5); // Връщаме само топ 5 чисти резултата
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
          setAddressSuggestions([]);
        }
      })();
    }, 350);
    return () => window.clearTimeout(debounce);
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

  const inputClasses = "mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400";
  const labelClasses = "flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 ml-1";

  return (
    <form onSubmit={(e) => {
        if (!isAddressVerified) {
          e.preventDefault();
          setAddressWarning('Моля, изберете валиден адрес от предложенията.');
          return;
        }
        onSubmit(e);
      }} 
      className="flex flex-col h-full bg-white sm:rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100"
    >
      <div className="bg-slate-50/80 p-6 border-b border-slate-100">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" /> Добавяне на клиент
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">Попълнете данните за новата доставка</p>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        
        {/* 1. Търсене в регистър */}
        <div className="relative group">
          <label className={labelClasses}><Search className="w-3.5 h-3.5" /> Бързо търсене в регистър</label>
          <div className="relative">
            <input
              type="text"
              value={registrySearch}
              onChange={e => onRegistrySearchChange(e.target.value)}
              className={`${inputClasses} pl-11 !bg-blue-50/50 !border-blue-100 focus:!bg-white`}
              placeholder="Търсене по ЕГН или Име..."
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
            {selectedRegistryEntryId && (
              <button 
                type="button" 
                onClick={onRegistryClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {registrySearch.trim() && registrySuggestions.length > 0 && (
            <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2">
              {registrySuggestions.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onRegistrySelect(entry)}
                  className="flex w-full items-center justify-between px-5 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-none"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-slate-900">{entry.name}</span>
                    <span className="text-xs text-slate-500">ЕГН: {entry.egn}</span>
                  </div>
                  <div className="bg-blue-100 p-1.5 rounded-lg">
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Лични данни */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className={labelClasses}>Име на клиента</label>
            <input
              type="text"
              value={clientForm.name}
              onChange={event => onClientInputChange('name', event.target.value)}
              className={inputClasses}
              placeholder="Име и фамилия"
              required
            />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClasses}>ЕГН</label>
            <input
              type="text"
              maxLength={10}
              value={clientForm.egn}
              onChange={event => onClientInputChange('egn', event.target.value)}
              readOnly={!!selectedRegistryEntryId}
              className={`${inputClasses} ${selectedRegistryEntryId ? 'bg-slate-100 cursor-not-allowed' : ''}`}
              placeholder="0000000000"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClasses}><Phone className="w-3.5 h-3.5" /> Телефонен номер</label>
            <input
              type="tel"
              maxLength={10}
              value={clientForm.phone}
              onChange={event => onClientInputChange('phone', event.target.value)}
              className={inputClasses}
              placeholder="+359..."
              required
            />
          </div>
        </div>

        {/* 3. Адресна информация с AUTO-SELECT логика */}
        <div className="relative">
          <label className={labelClasses}><MapPin className="w-3.5 h-3.5" /> Точен адрес</label>
          <div className="relative">
            <input
              type="text"
              value={clientForm.address}
              onChange={e => {
                onClientInputChange('address', e.target.value);
                setSelectedAddress(null);
                setIsAddressVerified(false);
                setAddressWarning(null);
              }}
              onFocus={() => setShowAddressSuggestions(true)}
              onBlur={() => {
                // 2. Логика за автоматично избиране на първия адрес
                window.setTimeout(() => {
                  const currentVal = clientForm.address.trim();
                  
                  // Ако има предложения и нищо не е потвърдено още
                  if (currentVal && !isAddressVerified && addressSuggestions.length > 0) {
                    handleSelectAddress(addressSuggestions[0]);
                  } 
                  // Ако е извън списъка и не е празно
                  else if (currentVal && !isAddressVerified) {
                    onClientInputChange('address', '');
                    setIsAddressVerified(false);
                    setAddressWarning('Моля, изберете валиден адрес от списъка.');
                  }
                  setShowAddressSuggestions(false);
                }, 300);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && addressSuggestions.length > 0 && !isAddressVerified) {
                  e.preventDefault();
                  handleSelectAddress(addressSuggestions[0]);
                }
              }}
              className={`${inputClasses} ${addressHighlight ? 'ring-2 ring-emerald-400' : ''}`}
              placeholder="Започнете да пишете адрес..."
              required
            />
          </div>
          
          {showAddressSuggestions && addressSuggestions.length > 0 && (
            <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {addressSuggestions.map((s, idx) => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelectAddress(s)}
                    className={`w-full px-5 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 ${idx === 0 ? 'bg-blue-50/30' : ''}`}
                  >
                    <MapPin className={`w-4 h-4 ${idx === 0 ? 'text-blue-500' : 'text-slate-400'}`} /> {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {addressWarning && <p className="mt-2 text-xs font-bold text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> {addressWarning}</p>}
        </div>

        {/* 4. Настройки на доставка */}
        <div className="space-y-6 pt-4 border-t border-slate-100">
           <div className="grid gap-6 sm:grid-cols-2">
             <div>
               <label className={labelClasses}><Calendar className="w-3.5 h-3.5" /> Дата на доставка</label>
               <input
                 type="date"
                 value={clientForm.serviceDate}
                 onChange={e => onClientInputChange('serviceDate', e.target.value)}
                 className={inputClasses}
               />
             </div>
             <div>
               <label className={labelClasses}><Utensils className="w-3.5 h-3.5" /> Вид меню</label>
               <select
                 value={clientForm.mealType}
                 onChange={e => onClientInputChange('mealType', e.target.value)}
                 className={inputClasses}
                 required
               >
                 <option value="Стандартно меню">Стандартно меню</option>
                 <option value="Диетично меню">Диетично меню</option>
                 <option value="Вегетарианско">Вегетарианско</option>
                 <option value="Само хляб">Само хляб</option>
               </select>
             </div>
           </div>

           <div className="grid gap-6 sm:grid-cols-3">
             <div className="sm:col-span-1">
               <label className={labelClasses}>Брой порции</label>
               <input
                 type="number"
                 min={1}
                 value={clientForm.mealCount}
                 onChange={e => onClientInputChange('mealCount', e.target.value)}
                 className={inputClasses}
                 required
               />
             </div>
             <div className="sm:col-span-2">
               <label className={labelClasses}><Truck className="w-3.5 h-3.5" /> Назначен шофьор</label>
               <select
                 value={clientForm.assignedDriverId}
                 onChange={e => onClientInputChange('assignedDriverId', e.target.value)}
                 disabled={driversLoading}
                 className={inputClasses}
               >
                 <option value="">Изберете шофьор...</option>
                 {drivers.map(d => (
                   <option key={d.id} value={d.id}>{d.name} ({d.routeArea})</option>
                 ))}
               </select>
             </div>
           </div>

           <div>
             <label className={labelClasses}><ClipboardList className="w-3.5 h-3.5" /> Бележки и изисквания</label>
             <textarea
               value={clientForm.notes}
               onChange={e => onClientInputChange('notes', e.target.value)}
               className={`${inputClasses} min-h-[100px] resize-none`}
               placeholder="Специфични изисквания, диета или детайли за достъп..."
             />
           </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onAddForToday}
          disabled={clientSubmitting}
          className="rounded-2xl bg-emerald-600 px-6 py-4 font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
        >
          {clientSubmitting ? 'Обработка...' : 'Добави за днес'}
        </button>
        <button
          type="submit"
          disabled={clientSubmitting}
          className="rounded-2xl bg-slate-900 px-6 py-4 font-bold text-white shadow-lg shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
        >
          {clientSubmitting ? 'Записване...' : 'Запази по дата'}
        </button>
      </div>

      {clientsError && (
        <div className="px-6 pb-6 text-center">
          <p className="text-sm font-bold text-red-500 bg-red-50 py-2 rounded-xl border border-red-100">{clientsError}</p>
        </div>
      )}
    </form>
  );
}