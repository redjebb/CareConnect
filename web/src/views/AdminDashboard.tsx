import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { addClient, deleteClient, getClientHistory, getClients } from '../clientService';
import { addScheduleItem, deleteScheduleByClient, getScheduleItems } from '../scheduleService';
import { addDriver, deleteDriver, getDrivers } from '../driverService';
import { addAdmin, deleteAdmin, getAdmins } from '../adminService';
import { getOpenIncidents } from '../incidentService';
import {
  addRegistryEntry,
  deleteRegistryEntry,
  getRegistryEntries,
  updateRegistryEntry
} from '../clientsRegistryService';
import { Client, ClientHistoryEntry, ClientRegistryEntry, Driver, Incident, ScheduleItem } from '../types';
import ReportView from '../ReportView';
import ScheduleCalendar from '../scheduleCalendar';
import ClientForm from '../components/ClientForm';
import RegistryTable from '../components/RegistryTable';
import UserProfileModal from '../components/UserProfileModal';

type ClientWithSchedule = Client & { nextVisitDate?: string | null };

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const isSameDay = (d1: Date, d2: Date) => startOfDay(d1).getTime() === startOfDay(d2).getTime();

const CITY_DATA: Record<string, string[]> = {
  София: [
    'Средец',
    'Красно село',
    'Възраждане',
    'Оборище',
    'Сердика',
    'Подуяне',
    'Слатина',
    'Изгрев',
    'Лозенец',
    'Триадица',
    'Красна поляна',
    'Илинден',
    'Надежда',
    'Искър',
    'Младост',
    'Студентски',
    'Витоша',
    'Овча купел',
    'Люлин',
    'Връбница',
    'Нови Искър',
    'Кремиковци',
    'Панчарево',
    'Банкя'
  ],
  Пловдив: ['Централен', 'Тракия', 'Южен', 'Северен', 'Западен', 'Източен'],
  Варна: ['Одесос', 'Приморски', 'Младост', 'Вл. Варненчик', 'Аспарухово']
};

const formatNextVisitDate = (value?: string | null) => {
  if (!value) {
    return 'Няма насрочено';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Няма насрочено';
  }
  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const renderLastCheckInStatus = (lastCheckIn: string | undefined) => {
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!lastCheckIn) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-500">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Няма отчет за посещение
      </span>
    );
  }

  const normalized = lastCheckIn.trim();
  const normalizedUpper = normalized.toUpperCase();

  const renderIncidentStatus = (payload: string) => {
    const trimmed = payload.trim();
    const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
    const timestamp = isoMatch ? isoMatch[0] : '';
    const incidentType = isoMatch ? trimmed.replace(timestamp, '').trim() : trimmed;
    const formattedDate = timestamp ? formatDate(timestamp) : 'неизвестно време';

    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Сигнал: {incidentType || 'Непознат тип'} ({formattedDate})
      </span>
    );
  };

  if (normalizedUpper.startsWith('INCIDENT:')) {
    const payload = normalized.slice(normalizedUpper.indexOf('INCIDENT:') + 'INCIDENT:'.length);
    return renderIncidentStatus(payload);
  }

  const isLegacySos = normalizedUpper.startsWith('SOS ');
  const printableValue = isLegacySos ? normalized.replace(/^SOS\s+/i, '') : normalized;
  const formatted = formatDate(printableValue);

  if (isLegacySos) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Сигнал: SOS ({formatted})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-500">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Последен отчет: {formatted}
    </span>
  );
};

interface PhotonFeature {
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
}

const buildPhotonLabel = (feature: PhotonFeature) => {
  const props = feature.properties ?? {};
  const parts: string[] = [];

  if (props.name) {
    parts.push(props.name);
  }

  if (props.street && props.street !== props.name) {
    parts.push(props.street);
  }

  if (props.housenumber) {
    parts.push(props.housenumber);
  }

  const locality = [props.city, props.postcode].filter(Boolean).join(' ');
  if (locality) {
    parts.push(locality);
  }

  if (props.country) {
    parts.push(props.country);
  }

  return parts.join(', ').trim();
};

const preferCyrillicLabel = (label: string) => /[\u0400-\u04FF]/.test(label);

const fetchPhotonSuggestions = async (query: string) => {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=de`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { features?: PhotonFeature[] };
  const features = Array.isArray(payload.features) ? payload.features : [];
  const mapped = features
    .map(feature => {
      const label = buildPhotonLabel(feature);
      const country = feature.properties?.country?.toLowerCase();
      const countryCode = feature.properties?.countrycode?.toLowerCase();
      return { label, country, countryCode };
    })
    .filter(item => item.label);

  const bulgarian = mapped.filter(
    item => item.country === 'bulgaria' || item.countryCode === 'bg'
  );
  const preferred = bulgarian.length > 0 ? bulgarian : mapped;
  const unique = Array.from(new Set(preferred.map(item => item.label)));
  return unique
    .sort((a, b) => Number(preferCyrillicLabel(b)) - Number(preferCyrillicLabel(a)))
    .slice(0, 5);
};

interface AdminDashboardProps {
  userEmail: string;
  isMasterAdmin: boolean;
  onLogout: () => Promise<void> | void;
}

export default function AdminDashboard({ userEmail, isMasterAdmin, onLogout }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<'clients' | 'drivers' | 'admins'>('clients');
  const [clientManagementTab, setClientManagementTab] = useState<'registry' | 'daily'>('daily');

  const [clients, setClients] = useState<ClientWithSchedule[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [clientForm, setClientForm] = useState({
    egn: '',
    name: '',
    address: '',
    phone: '',
    notes: '',
    assignedDriverId: '',
    serviceDate: '',
    mealType: 'Стандартно меню',
    mealCount: '1'
  });
  const [clientDeletingId, setClientDeletingId] = useState<string | null>(null);

  const [registryEntries, setRegistryEntries] = useState<ClientRegistryEntry[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [registrySubmitting, setRegistrySubmitting] = useState(false);
  const [registryDeletingId, setRegistryDeletingId] = useState<string | null>(null);
  const [registryEditingId, setRegistryEditingId] = useState<string | null>(null);
  const [registryForm, setRegistryForm] = useState({
    egn: '',
    name: '',
    address: '',
    phone: '',
    defaultMealType: 'Стандартно меню',
    defaultMealCount: '1'
  });

  const [registrySearch, setRegistrySearch] = useState('');
  const [selectedRegistryEntryId, setSelectedRegistryEntryId] = useState<string | null>(null);
  const [registryAddressSuggestions, setRegistryAddressSuggestions] = useState<string[]>([]);
  const [showRegistryAddressSuggestions, setShowRegistryAddressSuggestions] = useState(false);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileEntry, setProfileEntry] = useState<ClientRegistryEntry | null>(null);
  const [profileHistory, setProfileHistory] = useState<ClientHistoryEntry[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSearch, setProfileSearch] = useState('');
  const [isProfileSearchOpen, setIsProfileSearchOpen] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [driverSubmitting, setDriverSubmitting] = useState(false);
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    routeArea: '',
    selectedCity: ''
  });
  const [driverDeletingId, setDriverDeletingId] = useState<string | null>(null);

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [admins, setAdmins] = useState<{ id: string; name: string; email: string }[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminDeletingId, setAdminDeletingId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: ''
  });

  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);

  const [isSignaturePreviewOpen, setIsSignaturePreviewOpen] = useState(false);
  const [signaturePreviewDriverUrl, setSignaturePreviewDriverUrl] = useState<string | null>(null);
  const [signaturePreviewClientUrl, setSignaturePreviewClientUrl] = useState<string | null>(null);

  const fetchOpenIncidents = useCallback(async () => {
    try {
      const data = await getOpenIncidents();
      setOpenIncidents(data);
    } catch (err) {
      console.error('Неуспешно зареждане на инциденти.', err);
      setOpenIncidents([]);
    }
  }, []);

  const fetchScheduleItems = useCallback(async () => {
    try {
      const data = await getScheduleItems();
      setScheduleItems(data);
    } catch (err) {
      console.error('Неуспешно зареждане на графика.', err);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    setDriversLoading(true);
    setDriversError(null);
    try {
      const data = await getDrivers();
      setDrivers(data);
    } catch (err) {
      setDriversError('Неуспешно зареждане на шофьорите.');
    } finally {
      setDriversLoading(false);
    }
  }, []);

  const fetchRegistryEntries = useCallback(async () => {
    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const entries = await getRegistryEntries();
      setRegistryEntries(entries);
    } catch (err) {
      console.error('Неуспешно зареждане на регистъра.', err);
      setRegistryError('Неуспешно зареждане на регистъра.');
    } finally {
      setRegistryLoading(false);
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    if (!isMasterAdmin) {
      setAdmins([]);
      return;
    }

    setAdminsLoading(true);
    setAdminsError(null);
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error('Неуспешно зареждане на администратори.', err);
      setAdminsError('Неуспешно зареждане на администратори.');
    } finally {
      setAdminsLoading(false);
    }
  }, [isMasterAdmin]);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      const allClients = await getClients();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const enrichedClients: ClientWithSchedule[] = allClients.map(client => {
        const upcomingDates = scheduleItems
          .filter(item => item.clientId === client.id)
          .map(item => {
            const parsed = new Date(item.date);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
          })
          .filter((date): date is Date => !!date && date >= startOfToday)
          .sort((a, b) => a.getTime() - b.getTime());

        return {
          ...client,
          nextVisitDate: upcomingDates[0]?.toISOString() ?? null
        };
      });
      setClients(enrichedClients);
    } catch (err) {
      setClientsError('Неуспешно зареждане на клиентите.');
    } finally {
      setClientsLoading(false);
    }
  }, [scheduleItems]);

  useEffect(() => {
    void fetchScheduleItems();
    void fetchDrivers();
    void fetchRegistryEntries();
    void fetchAdmins();
    void fetchOpenIncidents();
  }, [fetchScheduleItems, fetchDrivers, fetchRegistryEntries, fetchAdmins, fetchOpenIncidents]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    const query = registryForm.address.trim();
    if (query.length < 3) {
      setRegistryAddressSuggestions([]);
      setShowRegistryAddressSuggestions(false);
      return;
    }

    const debounce = window.setTimeout(() => {
      void (async () => {
        try {
          const suggestions = await fetchPhotonSuggestions(query);
          setRegistryAddressSuggestions(suggestions);
          setShowRegistryAddressSuggestions(true);
        } catch (error) {
          console.error('Failed to fetch registry address suggestions.', error);
          setRegistryAddressSuggestions([]);
        }
      })();
    }, 350);

    return () => {
      window.clearTimeout(debounce);
    };
  }, [registryForm.address]);

  useEffect(() => {
    if (currentView === 'admins' && !isMasterAdmin) {
      setCurrentView('clients');
    }
  }, [currentView, isMasterAdmin]);

  const sortedRegistryEntries = useMemo(() => {
    return [...registryEntries].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bg'));
  }, [registryEntries]);

  const todayClients = useMemo(() => {
    const today = new Date();
    return clients.filter(client => {
      if (!client.nextVisitDate) {
        return false;
      }
      const parsed = new Date(client.nextVisitDate);
      if (Number.isNaN(parsed.getTime())) {
        return false;
      }
      return isSameDay(parsed, today);
    });
  }, [clients]);

  const totalClientsToday = todayClients.length;

  const totalPortionsToday = useMemo(() => {
    return todayClients.reduce((sum, client) => sum + (Number(client.mealCount) || 0), 0);
  }, [todayClients]);

  const remainingDeliveriesToday = useMemo(() => {
    return todayClients.filter(client => {
      const hasLastCheckIn = !!client.lastCheckIn?.trim();
      const hasSignature = !!client.lastSignature;
      return !hasLastCheckIn && !hasSignature;
    }).length;
  }, [todayClients]);

  const activeSosCount = useMemo(() => {
    return openIncidents.filter(incident => {
      const typeValue = (incident.type ?? '').toLowerCase();
      const isHighPriority = incident.status === 'Escalated' || typeValue.includes('sos');
      const isActive = incident.status !== 'Resolved';
      return isHighPriority && isActive;
    }).length;
  }, [openIncidents]);

  const registrySuggestions = useMemo(() => {
    const queryValue = registrySearch.trim().toLowerCase();
    if (!queryValue) {
      return [];
    }

    return sortedRegistryEntries
      .filter(entry => {
        const egnMatch = (entry.egn ?? '').toLowerCase().includes(queryValue);
        const nameMatch = (entry.name ?? '').toLowerCase().includes(queryValue);
        return egnMatch || nameMatch;
      })
      .slice(0, 8);
  }, [registrySearch, sortedRegistryEntries]);

  const profileSearchResults = useMemo(() => {
    const queryValue = profileSearch.trim().toLowerCase();
    if (!queryValue) {
      return [];
    }

    return sortedRegistryEntries
      .filter(entry => {
        const egnMatch = (entry.egn ?? '').toLowerCase().includes(queryValue);
        const nameMatch = (entry.name ?? '').toLowerCase().includes(queryValue);
        return egnMatch || nameMatch;
      })
      .slice(0, 8);
  }, [profileSearch, sortedRegistryEntries]);

  const applyRegistrySelection = (entry: ClientRegistryEntry) => {
    setSelectedRegistryEntryId(entry.id);
    setRegistrySearch(`${entry.egn} — ${entry.name}`);
    setClientForm(prev => ({
      ...prev,
      egn: entry.egn ?? '',
      name: entry.name ?? '',
      address: entry.address ?? '',
      phone: entry.phone ?? '',
      mealType: entry.defaultMealType ?? prev.mealType,
      mealCount: String(entry.defaultMealCount ?? 1)
    }));
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleClientInputChange = (field: keyof typeof clientForm, value: string) => {
    setClientForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegistryInputChange = (field: keyof typeof registryForm, value: string) => {
    setRegistryForm(prev => ({ ...prev, [field]: value }));
  };

  const resetRegistryForm = () => {
    setRegistryEditingId(null);
    setRegistryForm({
      egn: '',
      name: '',
      address: '',
      phone: '',
      defaultMealType: 'Стандартно меню',
      defaultMealCount: '1'
    });
  };

  const handleSubmitRegistryEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEgn = registryForm.egn.trim();
    if (!trimmedEgn) {
      setRegistryError('ЕГН е задължително поле.');
      return;
    }

    const existingWithSameEgn = registryEntries.find(
      entry => entry.egn.trim() === trimmedEgn && entry.id !== registryEditingId
    );
    if (existingWithSameEgn) {
      setRegistryError('В регистъра вече има запис с това ЕГН.');
      return;
    }

    setRegistrySubmitting(true);
    setRegistryError(null);
    try {
      const payload = {
        egn: trimmedEgn,
        name: registryForm.name,
        address: registryForm.address,
        phone: registryForm.phone,
        defaultMealType: registryForm.defaultMealType,
        defaultMealCount: Math.max(1, Number(registryForm.defaultMealCount) || 1)
      };

      if (registryEditingId) {
        await updateRegistryEntry(registryEditingId, payload);
      } else {
        await addRegistryEntry(payload);
      }

      resetRegistryForm();
      await fetchRegistryEntries();
    } catch (err) {
      console.error('Неуспешно записване в регистъра.', err);
      setRegistryError('Неуспешно записване в регистъра.');
    } finally {
      setRegistrySubmitting(false);
    }
  };

  const handleEditRegistryEntry = (entry: ClientRegistryEntry) => {
    setRegistryEditingId(entry.id);
    setRegistryError(null);
    setRegistryForm({
      egn: entry.egn ?? '',
      name: entry.name ?? '',
      address: entry.address ?? '',
      phone: entry.phone ?? '',
      defaultMealType: entry.defaultMealType ?? 'Стандартно меню',
      defaultMealCount: String(entry.defaultMealCount ?? 1)
    });
  };

  const handleRemoveRegistryEntry = async (entryId: string) => {
    setRegistryDeletingId(entryId);
    setRegistryError(null);
    try {
      await deleteRegistryEntry(entryId);
      await fetchRegistryEntries();
      if (registryEditingId === entryId) {
        resetRegistryForm();
      }
      if (selectedRegistryEntryId === entryId) {
        setSelectedRegistryEntryId(null);
        setRegistrySearch('');
        setClientForm(prev => ({ ...prev, egn: '' }));
      }
    } catch (err) {
      console.error('Неуспешно изтриване от регистъра.', err);
      setRegistryError('Неуспешно изтриване от регистъра.');
    } finally {
      setRegistryDeletingId(null);
    }
  };

  const handleOpenProfile = async (entry: ClientRegistryEntry) => {
    setProfileEntry(entry);
    setIsProfileModalOpen(true);
    setProfileLoading(true);
    setProfileError(null);
    try {
      const history = await getClientHistory(entry.egn);
      setProfileHistory(history);
    } catch (err) {
      console.error('Неуспешно зареждане на историята на клиента.', err);
      setProfileError('Неуспешно зареждане на историята на клиента.');
      setProfileHistory([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setIsProfileModalOpen(false);
    setProfileEntry(null);
    setProfileHistory([]);
    setProfileError(null);
  };

  const handleSelectProfileSearch = (entry: ClientRegistryEntry) => {
    void handleOpenProfile(entry);
    setProfileSearch('');
    setIsProfileSearchOpen(false);
  };

  const handleAddClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientForm.name || !clientForm.address) {
      setClientsError('Моля, попълнете името и адреса.');
      return;
    }
    if (!clientForm.assignedDriverId) {
      setClientsError('Моля, изберете шофьор за клиента.');
      return;
    }
    if (!clientForm.serviceDate) {
      setClientsError('Моля, изберете дата за посещение.');
      return;
    }

    const mealCountNumber = Math.max(1, Number(clientForm.mealCount) || 0);
    const trimmedMealType = clientForm.mealType.trim() || 'Стандартно меню';

    setClientSubmitting(true);
    setClientsError(null);
    try {
      const clientId = await addClient({
        egn: clientForm.egn.trim() ? clientForm.egn.trim() : undefined,
        name: clientForm.name,
        address: clientForm.address,
        phone: clientForm.phone,
        notes: clientForm.notes,
        assignedDriverId: clientForm.assignedDriverId,
        mealType: trimmedMealType,
        mealCount: mealCountNumber,
        lastCheckIn: ''
      });

      await addScheduleItem({
        clientId,
        driverId: clientForm.assignedDriverId,
        date: clientForm.serviceDate
      });
      setClientForm({
        egn: '',
        name: '',
        address: '',
        phone: '',
        notes: '',
        assignedDriverId: '',
        serviceDate: '',
        mealType: 'Стандартно меню',
        mealCount: '1'
      });

      setRegistrySearch('');
      setSelectedRegistryEntryId(null);

      await Promise.all([fetchClients(), fetchScheduleItems()]);
    } catch (err) {
      setClientsError('Неуспешно добавяне на клиент.');
      setClientSubmitting(false);
    }
  };

  const formatDateForInput = (value: Date) => value.toISOString().slice(0, 10);

  const handleAddClientForSelectedDate = async () => {
    const nextDateValue = formatDateForInput(selectedDate);
    setClientForm(prev => ({ ...prev, serviceDate: nextDateValue }));

    if (!clientForm.name || !clientForm.address) {
      setClientsError('Моля, попълнете името и адреса.');
      return;
    }
    if (!clientForm.assignedDriverId) {
      setClientsError('Моля, изберете шофьор за клиента.');
      return;
    }

    const mealCountNumber = Math.max(1, Number(clientForm.mealCount) || 0);
    const trimmedMealType = clientForm.mealType.trim() || 'Стандартно меню';

    setClientSubmitting(true);
    setClientsError(null);
    try {
      const clientId = await addClient({
        egn: clientForm.egn.trim() ? clientForm.egn.trim() : undefined,
        name: clientForm.name,
        address: clientForm.address,
        phone: clientForm.phone,
        notes: clientForm.notes,
        assignedDriverId: clientForm.assignedDriverId,
        mealType: trimmedMealType,
        mealCount: mealCountNumber,
        lastCheckIn: ''
      });

      await addScheduleItem({
        clientId,
        driverId: clientForm.assignedDriverId,
        date: nextDateValue
      });

      setClientForm({
        egn: '',
        name: '',
        address: '',
        phone: '',
        notes: '',
        assignedDriverId: '',
        serviceDate: '',
        mealType: 'Стандартно меню',
        mealCount: '1'
      });

      setRegistrySearch('');
      setSelectedRegistryEntryId(null);

      await Promise.all([fetchClients(), fetchScheduleItems()]);
    } catch (err) {
      console.error('Неуспешно добавяне на клиент за днес.', err);
      setClientsError('Неуспешно добавяне на клиент.');
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setClientDeletingId(clientId);
    setClientsError(null);
    try {
      await deleteClient(clientId);
      await deleteScheduleByClient(clientId);
      await Promise.all([fetchClients(), fetchScheduleItems()]);
    } catch (err) {
      setClientsError('Неуспешно изтриване на клиента.');
    } finally {
      setClientDeletingId(null);
    }
  };

  const handleDriverInputChange = (field: keyof typeof driverForm, value: string) => {
    setDriverForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddDriver = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { name, email, phone, selectedCity, routeArea } = driverForm;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedCity = selectedCity.trim();
    const trimmedDistrict = routeArea.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedCity || !trimmedDistrict) {
      setDriversError('Моля, попълнете всички полета за шофьора.');
      return;
    }

    const combinedRoute = `${trimmedCity}, ${trimmedDistrict}`;

    setDriverSubmitting(true);
    setDriversError(null);
    try {
      await addDriver({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        routeArea: combinedRoute
      });
      setDriverForm({
        name: '',
        email: '',
        phone: '',
        routeArea: '',
        selectedCity: ''
      });
      await fetchDrivers();
    } catch (err) {
      setDriversError('Неуспешно добавяне на шофьор.');
    } finally {
      setDriverSubmitting(false);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    setDriverDeletingId(driverId);
    setDriversError(null);
    try {
      await deleteDriver(driverId);
      await fetchDrivers();
    } catch (err) {
      setDriversError('Неуспешно изтриване на шофьор.');
    } finally {
      setDriverDeletingId(null);
    }
  };

  const handleAdminInputChange = (field: keyof typeof adminForm, value: string) => {
    setAdminForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = adminForm.name.trim();
    const trimmedEmail = adminForm.email.trim();
    if (!trimmedName || !trimmedEmail) {
      setAdminsError('Моля, попълнете името и имейла на администратора.');
      return;
    }

    setAdminSubmitting(true);
    setAdminsError(null);
    try {
      await addAdmin({
        name: trimmedName,
        email: trimmedEmail
      });
      setAdminForm({ name: '', email: '' });
      await fetchAdmins();
    } catch (err) {
      console.error('Неуспешно добавяне на администратор.', err);
      setAdminsError('Неуспешно добавяне на администратор.');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    setAdminDeletingId(adminId);
    setAdminsError(null);
    try {
      await deleteAdmin(adminId);
      await fetchAdmins();
    } catch (err) {
      setAdminsError('Неуспешно изтриване на администратор.');
    } finally {
      setAdminDeletingId(null);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    setReportGenerating(true);
    try {
      await Promise.all([fetchClients(), fetchDrivers()]);
      setShowReport(true);

      queueMicrotask(() => {
        window.print();
        setShowReport(false);
      });
    } catch (error) {
      console.error('Error generating report:', error);
      setClientsError('Грешка при генериране на отчета.');
      setShowReport(false);
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      {showReport && <ReportView clients={clients} drivers={drivers} />}

      {!showReport && (
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">CareConnect</p>
                <h1 className="text-2xl font-bold text-slate-900">
                  Добре дошъл, <span className="text-blue-600">{userEmail}</span>!
                </h1>
              </div>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Изход
              </button>
            </div>
            <nav className="mt-4">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
                {isMasterAdmin && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('admins')}
                    className={`px-4 py-2 rounded-lg transition ${
                      currentView === 'admins'
                        ? 'bg-white text-slate-900 shadow'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Управление на Администратори
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentView('clients')}
                  className={`ml-1 px-4 py-2 rounded-lg transition ${
                    currentView === 'clients'
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Управление на Клиенти
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('drivers')}
                  className={`ml-1 px-4 py-2 rounded-lg transition ${
                    currentView === 'drivers'
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Управление на Шофьори
                </button>
              </div>
            </nav>
          </header>

          {currentView !== 'clients' ? (
            <section className="rounded-2xl bg-white p-5 shadow">
              <label className="text-sm font-semibold text-slate-700">
                Бързо търсене на профил (Име или ЕГН)
              </label>
              <div className="relative mt-3 max-w-xl">
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
                        onClick={() => handleSelectProfileSearch(entry)}
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
            </section>
          ) : null}

          {isMasterAdmin && currentView === 'admins' ? (
            <section className="grid gap-6 md:grid-cols-2">
              <form onSubmit={handleAddAdmin} className="rounded-2xl bg-white p-6 shadow">
                <h2 className="text-xl font-semibold text-slate-900">Добави администратор</h2>
                <p className="mt-1 text-sm text-slate-500">Попълнете детайли за нов администратор.</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Име</label>
                    <input
                      type="text"
                      value={adminForm.name}
                      onChange={event => handleAdminInputChange('name', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Петър Петров"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Имейл</label>
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={event => handleAdminInputChange('email', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="admin@careconnect.bg"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
                >
                  {adminSubmitting ? 'Добавяне...' : 'Запази администратор'}
                </button>
                {adminsError ? <p className="mt-3 text-sm text-red-600">{adminsError}</p> : null}
              </form>

              <div className="rounded-2xl bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">Списък с администратори</h2>
                  {adminsLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
                </div>
                {adminsLoading ? (
                  <p className="mt-6 text-sm text-slate-500">Loading admins...</p>
                ) : admins.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">Няма налични администратори.</p>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="px-4 py-2 font-medium">Име</th>
                          <th className="px-4 py-2 font-medium">Имейл</th>
                          <th className="px-4 py-2 font-medium text-right">Действие</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {admins.map(admin => (
                          <tr key={admin.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{admin.name}</td>
                            <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => void handleDeleteAdmin(admin.id)}
                                disabled={adminDeletingId === admin.id}
                                className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                {adminDeletingId === admin.id ? 'Изтриване...' : 'Изтрий'}
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
          ) : currentView === 'clients' ? (
            <section className="space-y-6">
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
                            onClick={() => handleSelectProfileSearch(entry)}
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

              <div className="inline-flex rounded-2xl bg-white p-2 shadow">
                <button
                  type="button"
                  onClick={() => setClientManagementTab('registry')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    clientManagementTab === 'registry'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Регистър (Картотека)
                </button>
                <button
                  type="button"
                  onClick={() => setClientManagementTab('daily')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    clientManagementTab === 'daily'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Дневен списък
                </button>
              </div>

              {clientManagementTab === 'registry' ? (
                <section className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                  <form onSubmit={handleSubmitRegistryEntry} className="rounded-2xl bg-white p-6 shadow">
                    <h2 className="text-xl font-semibold text-slate-900">Регистър (Картотека)</h2>
                    <p className="mt-1 text-sm text-slate-500">Добавяйте хора веднъж и ги използвайте в дневния списък.</p>
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">ЕГН</label>
                        <input
                          type="text"
                          value={registryForm.egn}
                          onChange={event => handleRegistryInputChange('egn', event.target.value)}
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
                          onChange={event => handleRegistryInputChange('name', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="Мария Иванова"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Телефон</label>
                        <input
                          type="tel"
                          value={registryForm.phone}
                          onChange={event => handleRegistryInputChange('phone', event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="+359 88 123 4567"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-slate-700">Адрес</label>
                        <input
                          type="text"
                          value={registryForm.address}
                          onChange={event => handleRegistryInputChange('address', event.target.value)}
                          onFocus={() => setShowRegistryAddressSuggestions(true)}
                          onBlur={() => {
                            window.setTimeout(() => setShowRegistryAddressSuggestions(false), 150);
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
                                  onClick={() => {
                                    handleRegistryInputChange('address', suggestion);
                                    setRegistryAddressSuggestions([]);
                                    setShowRegistryAddressSuggestions(false);
                                  }}
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
                            onChange={event => handleRegistryInputChange('defaultMealType', event.target.value)}
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
                            onChange={event => handleRegistryInputChange('defaultMealCount', event.target.value)}
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
                        onClick={resetRegistryForm}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Откажи
                      </button>
                    </div>
                    {registryError ? <p className="mt-3 text-sm text-red-600">{registryError}</p> : null}
                  </form>

                  <RegistryTable
                    entries={sortedRegistryEntries}
                    isLoading={registryLoading}
                    deletingId={registryDeletingId}
                    onEdit={handleEditRegistryEntry}
                    onDelete={handleRemoveRegistryEntry}
                    onViewProfile={entry => void handleOpenProfile(entry)}
                  />
                </section>
              ) : (
                <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                  <ScheduleCalendar
                    scheduleItems={scheduleItems}
                    clients={clients}
                    drivers={drivers}
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                  />

                  <div className="space-y-6">
                    <ClientForm
                      registrySearch={registrySearch}
                      selectedRegistryEntryId={selectedRegistryEntryId}
                      registrySuggestions={registrySuggestions}
                      onRegistrySearchChange={value => {
                        setRegistrySearch(value);
                        setSelectedRegistryEntryId(null);
                      }}
                      onRegistrySelect={applyRegistrySelection}
                      onRegistryClear={() => {
                        setSelectedRegistryEntryId(null);
                        setRegistrySearch('');
                        setClientForm(prev => ({ ...prev, egn: '' }));
                      }}
                      clientForm={clientForm}
                      onClientInputChange={handleClientInputChange}
                      drivers={drivers}
                      driversLoading={driversLoading}
                      clientSubmitting={clientSubmitting}
                      clientsError={clientsError}
                      onSubmit={handleAddClient}
                      onAddForToday={handleAddClientForSelectedDate}
                    />

                    <div className="rounded-2xl bg-white p-6 shadow">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-900">Списък с клиенти</h2>
                        <div className="flex items-center gap-3">
                          {clientsLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
                          <button
                            type="button"
                            onClick={() => void handleGenerateMonthlyReport()}
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
                                          onClick={() => {
                                            setSignaturePreviewDriverUrl(client.driverSignature ?? null);
                                            setSignaturePreviewClientUrl(
                                              client.clientSignature ?? client.lastSignature ?? null
                                            );
                                            setIsSignaturePreviewOpen(true);
                                          }}
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
                                      onClick={() => void handleDeleteClient(client.id)}
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
              )}
            </section>
          ) : (
            <section className="grid gap-6 md:grid-cols-2">
              <form onSubmit={handleAddDriver} className="rounded-2xl bg-white p-6 shadow">
                <h2 className="text-xl font-semibold text-slate-900">Добави шофьор</h2>
                <p className="mt-1 text-sm text-slate-500">Попълнете детайли за нов шофьор.</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Име</label>
                    <input
                      type="text"
                      value={driverForm.name}
                      onChange={event => handleDriverInputChange('name', event.target.value)}
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
                      onChange={event => handleDriverInputChange('email', event.target.value)}
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
                      onChange={event => handleDriverInputChange('phone', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="+359 88 123 4567"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Град</label>
                    <select
                      value={driverForm.selectedCity}
                      onChange={event =>
                        setDriverForm(prev => ({
                          ...prev,
                          selectedCity: event.target.value,
                          routeArea: ''
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                    >
                      <option value="">Изберете град</option>
                      {Object.keys(CITY_DATA).map(city => (
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
                      onChange={event => handleDriverInputChange('routeArea', event.target.value)}
                      disabled={!driverForm.selectedCity}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                      required
                    >
                      <option value="">
                        {driverForm.selectedCity ? 'Изберете район' : 'Моля, изберете град'}
                      </option>
                      {(CITY_DATA[driverForm.selectedCity] ?? []).map(district => (
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
                                onClick={() => void handleDeleteDriver(driver.id)}
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
          )}


          <UserProfileModal
            isOpen={isProfileModalOpen}
            entry={profileEntry}
            history={profileHistory}
            isLoading={profileLoading}
            errorMessage={profileError}
            onClose={handleCloseProfile}
          />

          {isSignaturePreviewOpen && (signaturePreviewDriverUrl || signaturePreviewClientUrl) ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Подпис на клиента</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignaturePreviewOpen(false);
                      setSignaturePreviewDriverUrl(null);
                      setSignaturePreviewClientUrl(null);
                    }}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Затвори
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {signaturePreviewDriverUrl ? (
                    <div className="overflow-hidden rounded-md border border-slate-200">
                      <div className="bg-slate-50 px-2 py-1 text-xs text-slate-600">Шофьор</div>
                      <img
                        src={signaturePreviewDriverUrl}
                        alt="Подпис шофьор"
                        className="max-h-[60vh] w-full object-contain bg-white"
                      />
                    </div>
                  ) : null}
                  {signaturePreviewClientUrl ? (
                    <div className="overflow-hidden rounded-md border border-slate-200">
                      <div className="bg-slate-50 px-2 py-1 text-xs text-slate-600">Клиент</div>
                      <img
                        src={signaturePreviewClientUrl}
                        alt="Подпис клиент"
                        className="max-h-[60vh] w-full object-contain bg-white"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
