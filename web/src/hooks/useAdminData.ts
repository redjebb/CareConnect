/*
 * CareConnect - Платформа за Домашен Социален Патронаж
 * Copyright (C) 2026 Адам Биков , Реджеб Туджар
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useCallback, useEffect, useMemo, useState } from 'react';
import emailjs from '@emailjs/browser';
import { addClient, deleteClient, getClientHistory, getClients } from '../services/clientService';
import { addScheduleItem, deleteScheduleByClient, getScheduleItems } from '../services/scheduleService';
import { addDriver, deleteDriver, getDrivers } from '../services/driverService';
import { addAdmin, deleteAdmin, getAdmins } from '../services/adminService';
import { getOpenIncidents } from '../services/incidentService';
import {
  addRegistryEntry,
  deleteRegistryEntry,
  getRegistryEntries,
  updateRegistryEntry
} from '../services/clientsRegistryService';
import type { Client, ClientHistoryEntry, ClientRegistryEntry, Driver, Incident, ScheduleItem } from '../types';
import { useNotification } from '../components/NotificationProvider';

type ClientWithSchedule = Client & { nextVisitDate?: string | null };

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const isSameDay = (d1: Date, d2: Date) => startOfDay(d1).getTime() === startOfDay(d2).getTime();

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

  if (props.name) parts.push(props.name);
  if (props.street && props.street !== props.name) parts.push(props.street);
  if (props.housenumber) parts.push(props.housenumber);

  const locality = [props.city, props.postcode].filter(Boolean).join(' ');
  if (locality) parts.push(locality);
  if (props.country) parts.push(props.country);

  return parts.join(', ').trim();
};

const preferCyrillicLabel = (label: string) => /[\u0400-\u04FF]/.test(label);

const fetchPhotonSuggestions = async (query: string) => {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=de`;
  const response = await fetch(url);
  if (!response.ok) return [];

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

  const bulgarian = mapped.filter(item => item.country === 'bulgaria' || item.countryCode === 'bg');
  const preferred = bulgarian.length > 0 ? bulgarian : mapped;
  const unique = Array.from(new Set(preferred.map(item => item.label)));

  return unique
    .sort((a, b) => Number(preferCyrillicLabel(b)) - Number(preferCyrillicLabel(a)))
    .slice(0, 5);
};

export function useAdminData(isMasterAdmin: boolean, currentAdminEmail: string) {
  const { showNotification } = useNotification();

  const isValidEgn = (egn: string) => /^\d{10}$/.test(egn.trim());
  const isValidPhone = (phone: string) => /^\d{10}$/.test(phone.replace(/[\s\-]/g, ''));
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
  const [adminForm, setAdminForm] = useState({ name: '', email: '' });

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
    } catch {
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
      const startOfToday = startOfDay(new Date());

      const enrichedClients: ClientWithSchedule[] = allClients.map((client: Client) => {
        const upcomingDates = scheduleItems
          .filter(item => item.clientId === client.id)
          .map(item => {
            const parsed = new Date(item.date);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
          })
          .filter((date): date is Date => !!date && date >= startOfToday)
          .sort((a, b) => a.getTime() - b.getTime());

        return { ...client, nextVisitDate: upcomingDates[0]?.toISOString() ?? null };
      });

      setClients(enrichedClients);
    } catch {
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

    return () => window.clearTimeout(debounce);
  }, [registryForm.address]);

  useEffect(() => {
    if (currentView === 'admins' && !isMasterAdmin) setCurrentView('clients');
  }, [currentView, isMasterAdmin]);

  const sortedRegistryEntries = useMemo(() => {
    return [...registryEntries].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bg'));
  }, [registryEntries]);

  const registrySuggestions = useMemo(() => {
    const queryValue = registrySearch.trim().toLowerCase();
    if (!queryValue) return [];

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
    if (!queryValue) return [];

    return sortedRegistryEntries
      .filter(entry => {
        const egnMatch = (entry.egn ?? '').toLowerCase().includes(queryValue);
        const nameMatch = (entry.name ?? '').toLowerCase().includes(queryValue);
        return egnMatch || nameMatch;
      })
      .slice(0, 8);
  }, [profileSearch, sortedRegistryEntries]);

  const todayClients = useMemo(() => {
    return clients.filter(client => {
      const hasScheduleForSelectedDate = scheduleItems.some(
        item => isSameDay(new Date(item.date), selectedDate) && item.clientId === client.id
      );
      return hasScheduleForSelectedDate;
    });
  }, [clients, scheduleItems, selectedDate]);

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

  const handleDateChange = (date: Date) => setSelectedDate(date);

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

  const handleSubmitRegistryEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEgn = registryForm.egn.trim();
    if (!trimmedEgn) {
      showNotification('ЕГН е задължително поле.', 'warning');
      return;
    }

    if (!isValidEgn(trimmedEgn)) {
      showNotification('ЕГН трябва да съдържа точно 10 цифри.', 'error');
      return;
    }

    if (registryForm.phone && !isValidPhone(registryForm.phone)) {
      showNotification('Телефонният номер трябва да съдържа точно 10 цифри.', 'error');
      return;
    }

    const existingWithSameEgn = registryEntries.find(
      entry => entry.egn.trim() === trimmedEgn && entry.id !== registryEditingId
    );
    if (existingWithSameEgn) {
      showNotification('В регистъра вече има запис с това ЕГН.', 'error');
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
        
        // Update profileEntry if the edited entry is currently being viewed
        if (profileEntry?.id === registryEditingId) {
          setProfileEntry(prev => prev ? { ...prev, ...payload } : null);
        }
      } else {
        await addRegistryEntry(payload);
      }

      resetRegistryForm();
      
      // Synchronize ALL data - refresh registry AND clients to reflect name/address changes in Daily List
      await Promise.all([
        fetchRegistryEntries(),
        fetchClients(),
        fetchScheduleItems()
      ]);
    } catch (err) {
      console.error('Неуспешно записване в регистъра.', err);
      showNotification('Неуспешно записване в регистъра.', 'error');
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
    if (!entryId) return;
    
    setRegistryDeletingId(entryId);
    setRegistryError(null);
    try {
      // Find the entry to get its EGN before deletion
      const entryToDelete = registryEntries.find(e => e?.id === entryId);
      const egnToDelete = entryToDelete?.egn?.trim();
      
      // Delete the registry entry
      await deleteRegistryEntry(entryId);
      
      // If entry has EGN, also delete all clients with matching EGN (cascade)
      if (egnToDelete) {
        const clientsWithEgn = clients.filter(c => c?.egn?.trim() === egnToDelete);
        for (const client of clientsWithEgn) {
          if (client?.id) {
            try {
              await deleteClient(client.id);
              await deleteScheduleByClient(client.id);
            } catch (err) {
              console.warn('Failed to cascade delete client:', client.id, err);
            }
          }
        }
      }
      
      // Synchronize ALL data globally
      await Promise.all([
        fetchRegistryEntries(),
        fetchClients(),
        fetchScheduleItems()
      ]);

      // Clean up local form state if needed
      if (registryEditingId === entryId) resetRegistryForm();
      if (selectedRegistryEntryId === entryId) {
        setSelectedRegistryEntryId(null);
        setRegistrySearch('');
        setClientForm(prev => ({ ...prev, egn: '' }));
      }
      
      // Close profile modal if viewing deleted entry
      if (profileEntry?.id === entryId) {
        setIsProfileModalOpen(false);
        setProfileEntry(null);
        setProfileHistory([]);
      }
    } catch (err) {
      console.error('Неуспешно изтриване от регистъра.', err);
      showNotification('Неуспешно изтриване от регистъра.', 'error');
    } finally {
      setRegistryDeletingId(null);
    }
  };

  const handleOpenProfile = async (entry: ClientRegistryEntry) => {
    console.log('Opening profile for:', entry);

    // Always open the modal immediately, even if history fetch fails.
    setProfileEntry(entry);
    setIsProfileModalOpen(true);
    setProfileLoading(true);
    setProfileError(null);
    setProfileHistory([]);

    try {
      const egn = (entry?.egn ?? '').trim();
      if (!egn) {
        setProfileError('Липсва ЕГН за този профил.');
        return;
      }

      // Fetch fresh registry data to ensure we have the latest info
      const freshRegistryData = registryEntries.find(e => e?.id === entry?.id);
      if (freshRegistryData && freshRegistryData !== entry) {
        setProfileEntry(freshRegistryData);
      }

      const history = await getClientHistory(egn);
      setProfileHistory(Array.isArray(history) ? history : []);
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

  const handleAddClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clientForm.name || !clientForm.address) {
      showNotification('Моля, попълнете името и адреса.', 'error');
      return;
    }
    if (!clientForm.assignedDriverId) {
      showNotification('Моля, изберете шофьор за клиента.', 'error');
      return;
    }
    if (!clientForm.serviceDate) {
      showNotification('Моля, изберете дата за посещение.', 'error');
      return;
    }

    const trimmedEgn = clientForm.egn.trim();
    if (trimmedEgn && !/^\d{10}$/.test(trimmedEgn)) {
      showNotification('ЕГН трябва да съдържа точно 10 цифри.', 'error');
      return;
    }

    const cleanedPhone = clientForm.phone.replace(/[\s\-]/g, '');
    if (cleanedPhone && !/^\d{10}$/.test(cleanedPhone)) {
      showNotification('Телефонният номер трябва да съдържа точно 10 цифри.', 'error');
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
        date: clientForm.serviceDate,
        assignedByAdminEmail: currentAdminEmail
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

      // Synchronize ALL data - refresh clients, schedule, AND registry to sync daily stats
      await Promise.all([
        fetchClients(),
        fetchScheduleItems(),
        fetchRegistryEntries()
      ]);
      showNotification(`Клиентът ${clientForm.name} е добавен към графика!`, 'success');
    } catch {
      setClientsError('Неуспешно добавяне на клиент.');
    } finally {
      setClientSubmitting(false);
    }


  };

  const formatDateForInput = (value: Date) => value.toISOString().slice(0, 10);

  const handleAddClientForSelectedDate = async () => {
    const nextDateValue = formatDateForInput(selectedDate);
    setClientForm(prev => ({ ...prev, serviceDate: nextDateValue }));

    if (!clientForm.name || !clientForm.address) {
      showNotification('Моля, попълнете името и адреса.', 'warning');
      return;
    }
    if (!clientForm.assignedDriverId) {
      showNotification('Моля, изберете шофьор за клиента.', 'warning');
      return;
    }

    const trimmedEgn = clientForm.egn.trim();
    if (trimmedEgn && !/^\d{10}$/.test(trimmedEgn)) {
      showNotification('ЕГН трябва да съдържа точно 10 цифри.', 'error');
      return;
    }

    const cleanedPhone = clientForm.phone.replace(/[\s\-]/g, '');
    if (cleanedPhone && !/^\d{10}$/.test(cleanedPhone)) {
      showNotification('Телефонният номер трябва да съдържа точно 10 цифри.', 'error');
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
        date: nextDateValue,
        assignedByAdminEmail: currentAdminEmail
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

      // Synchronize ALL data - refresh clients, schedule, AND registry to sync daily stats
      await Promise.all([
        fetchClients(),
        fetchScheduleItems(),
        fetchRegistryEntries()
      ]);
    } catch (err) {
      console.error('Неуспешно добавяне на клиент за днес.', err);
      showNotification('Неуспешно добавяне на клиент.', 'error');
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!clientId) return;
    
    setClientDeletingId(clientId);
    setClientsError(null);
    try {
      await deleteClient(clientId);
      await deleteScheduleByClient(clientId);
      
      // Synchronize ALL data globally - refresh registry, clients, and schedule together
      await Promise.all([
        fetchClients(),
        fetchScheduleItems(),
        fetchRegistryEntries()
      ]);
      showNotification('Изтриването беше успешно.', 'success');
    } catch (err) {
      showNotification('Неуспешно изтриване на клиента.', 'error');
    } finally {
      setClientDeletingId(null);
    }
  };

  const handleDriverInputChange = (field: keyof typeof driverForm, value: string) => {
    setDriverForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDriverCityChange = (city: string) => {
    setDriverForm(prev => ({ ...prev, selectedCity: city, routeArea: '' }));
  };

 const handleAddDriver = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { name, email, phone, selectedCity, routeArea } = driverForm;
    const trimmedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setDriversError('Моля, въведете валиден имейл адрес (напр. driver@careconnect.bg).');
      return;
    }

    const cleanedPhone = phone.replace(/[\s\-]/g, '');
    if (!/^\d{10}$/.test(cleanedPhone)) {
      setDriversError('Телефонният номер трябва да съдържа точно 10 цифри.');
      return;
    }

    const combinedRoute = `${selectedCity.trim()}, ${routeArea.trim()}`;

    setDriverSubmitting(true);
    try {
      // 1. Добавяме шофьор със статус PENDING и роля DRIVER
      await addDriver({ 
        name: name.trim(), 
        email: trimmedEmail, 
        phone: phone.trim(), 
        routeArea: combinedRoute,
        status: 'pending',
        role: 'DRIVER' 
      });

      // 2. Създаваме покана 
      await addDoc(collection(db, 'invitations'), {
        email: trimmedEmail,
        role: 'driver',
        status: 'pending', 
        createdAt: new Date().toISOString()
      });

      // 3. EmailJS
      const activationUrl = `https://careconnect-d7bd7.web.app/activate?email=${encodeURIComponent(trimmedEmail)}`;
      await emailjs.send('service_dkng7ol', 'template_picgzcg', { email: trimmedEmail, link: activationUrl }, 'ikmstn4Jj0VVM1gWD');

      setDriverForm({ name: '', email: '', phone: '', routeArea: '', selectedCity: '' });
      await fetchDrivers();
      showNotification('Шофьорът е създаден и поканата е изпратена!', 'success');
    } catch (err) {
      setDriversError('Грешка при добавяне.');
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
      showNotification('Изтриването беше успешно.', 'success');
    } catch (err) {
      showNotification('Неуспешно изтриване на шофьор.', 'error');
    } finally {
      setDriverDeletingId(null);
    }
  };

  const handleAdminInputChange = (field: keyof typeof adminForm, value: string) => {
    setAdminForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const trimmedEmail = adminForm.email.trim();
  const trimmedName = adminForm.name.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setAdminsError('Моля, въведете валиден имейл адрес.');
      return;
    }

  setAdminSubmitting(true);
  try {
    // 1.Добавяне в колекция 'admins' с всички полета
    await addDoc(collection(db, 'admins'), { 
      name: trimmedName, 
      email: trimmedEmail, 
      status: 'pending',
      role: 'MANAGER'
    });

    // 2. Създаваме покана
    await addDoc(collection(db, 'invitations'), {
      email: trimmedEmail,
      role: 'admin',
      status: 'sent',
      createdAt: new Date().toISOString()
    });

    // 3. EmailJS
    const activationUrl = `https://careconnect-d7bd7.web.app/activate?email=${encodeURIComponent(trimmedEmail)}`;
    await emailjs.send('service_dkng7ol', 'template_picgzcg', { email: trimmedEmail, link: activationUrl }, 'ikmstn4Jj0VVM1gWD');

    setAdminForm({ name: '', email: '' });
    await fetchAdmins();
    showNotification('Новият мениджър е добавен успешно!', 'success');
  } catch (err) {
    setAdminsError('Грешка при добавяне.');
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
      showNotification('Изтриването беше успешно.', 'success');
    } catch (err) {
      showNotification('Неуспешно изтриване на администратор.', 'error');
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
      showNotification('Грешка при генериране на отчета.', 'error');
      setShowReport(false);
    } finally {
      setReportGenerating(false);
    }
  };

  const handleSelectRegistryAddressSuggestion = (suggestion: string) => {
    handleRegistryInputChange('address', suggestion);
    setRegistryAddressSuggestions([]);
    setShowRegistryAddressSuggestions(false);
  };

  const handleOpenSignaturePreview = (driverUrl: string | null, clientUrl: string | null) => {
    setSignaturePreviewDriverUrl(driverUrl);
    setSignaturePreviewClientUrl(clientUrl);
    setIsSignaturePreviewOpen(true);
  };

  const handleCloseSignaturePreview = () => {
    setIsSignaturePreviewOpen(false);
    setSignaturePreviewDriverUrl(null);
    setSignaturePreviewClientUrl(null);
  };

  return {
    // view state
    currentView,
    setCurrentView,
    clientManagementTab,
    setClientManagementTab,

    // clients
    clients,
    clientsLoading,
    clientsError,
    clientSubmitting,
    clientForm,
    clientDeletingId,
    setClientForm,
    setClientsError,
    handleClientInputChange,
    handleAddClient,
    handleAddClientForSelectedDate,
    handleDeleteClient,

    // schedule/report
    scheduleItems,
    selectedDate,
    handleDateChange,
    showReport,
    reportGenerating,
    handleGenerateMonthlyReport,

    // registry
    registryEntries,
    sortedRegistryEntries,
    registryLoading,
    registryError,
    registrySubmitting,
    registryDeletingId,
    registryEditingId,
    registryForm,
    registrySearch,
    selectedRegistryEntryId,
    registrySuggestions,
    registryAddressSuggestions,
    showRegistryAddressSuggestions,
    setRegistrySearch,
    setSelectedRegistryEntryId,
    setShowRegistryAddressSuggestions,
    handleRegistryInputChange,
    resetRegistryForm,
    handleSubmitRegistryEntry,
    handleEditRegistryEntry,
    handleRemoveRegistryEntry,
    applyRegistrySelection,
    handleSelectRegistryAddressSuggestion,

    // profile modal/search
    isProfileModalOpen,
    profileEntry,
    profileHistory,
    profileLoading,
    profileError,
    profileSearch,
    isProfileSearchOpen,
    setProfileSearch,
    setIsProfileSearchOpen,
    profileSearchResults,
    handleOpenProfile,
    handleCloseProfile,
    handleSelectProfileSearch,

    // drivers
    drivers,
    driversLoading,
    driversError,
    driverSubmitting,
    driverForm,
    driverDeletingId,
    handleDriverInputChange,
    handleDriverCityChange,
    handleAddDriver,
    handleDeleteDriver,

    // admins
    admins,
    adminsLoading,
    adminsError,
    adminSubmitting,
    adminDeletingId,
    adminForm,
    handleAdminInputChange,
    handleAddAdmin,
    handleDeleteAdmin,

    // incidents/stats
    openIncidents,
    totalClientsToday,
    totalPortionsToday,
    remainingDeliveriesToday,
    activeSosCount,

    // signature preview
    isSignaturePreviewOpen,
    signaturePreviewDriverUrl,
    signaturePreviewClientUrl,
    handleOpenSignaturePreview,
    handleCloseSignaturePreview
  };
}
