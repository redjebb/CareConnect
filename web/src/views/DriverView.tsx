import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Client, Driver, ScheduleItem } from '../types';
import { getClients, getClientsByDriver, updateClientLastCheckIn, updateClientSignatures } from '../services/clientService';
import { getScheduleItems } from '../services/scheduleService';
import { addIncident } from '../services/incidentService';
import IncidentReporter from '../IncidentReporter';
import DriverRoute, { DriverVisit as DriverVisitCard } from '../components/DriverRoute';
import SignatureModal from '../components/SignatureModal';
import {completeDelivery} from '../services/deliveryService';
import { startShift, endShift } from '../services/driverStatsService';

type DriverVisit = {
  client: Client;
  schedule: ScheduleItem;
  date: Date;
  sequenceNumber?: number;
  distanceFromPreviousKm?: number | null;
};

type ShiftData = {
  isActive: boolean;
  startTime: string | null;
  deliveredCount: number;
};

const SHIFT_STORAGE_KEY = 'careconnect_driver_shift';

const getStoredShift = (): ShiftData | null => {
  try {
    const stored = localStorage.getItem(SHIFT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveShiftToStorage = (data: ShiftData) => {
  try {
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save shift data:', err);
  }
};

const clearShiftFromStorage = () => {
  try {
    localStorage.removeItem(SHIFT_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear shift data:', err);
  }
};

const formatDuration = (startTime: string): string => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}ч ${minutes}мин`;
};

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const isSameDay = (d1: Date, d2: Date) => startOfDay(d1).getTime() === startOfDay(d2).getTime();

const isTomorrow = (date: Date) => {
  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
};

const isAfterTomorrow = (date: Date) => {
  const dayAfterTomorrow = startOfDay(new Date());
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return date.getTime() >= dayAfterTomorrow.getTime();
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

const arcGisMarkerShadow =
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
const pendingMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: arcGisMarkerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const deliveredMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: arcGisMarkerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


function MapBoundsController({
  coordinates,
  fallbackCenter,
  driverPosition
}: {
  coordinates: Array<{ lat: number; lng: number }>;
  fallbackCenter: { lat: number; lng: number };
  driverPosition: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const hasCenteredOnDriver = useRef(false);

  useEffect(() => {
    if (driverPosition && !hasCenteredOnDriver.current) {
      map.setView([driverPosition.lat, driverPosition.lng], 13);
      hasCenteredOnDriver.current = true;
    }

    if (coordinates.length === 0) {
      const center = driverPosition ?? fallbackCenter;
      map.setView([center.lat, center.lng], 12);
      return;
    }

    const boundsPoints = [
      ...coordinates.map(coord => [coord.lat, coord.lng] as [number, number]),
      ...(driverPosition ? [[driverPosition.lat, driverPosition.lng] as [number, number]] : [])
    ];
    const bounds = L.latLngBounds(boundsPoints as L.LatLngBoundsLiteral);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [coordinates, fallbackCenter, map, driverPosition]);

  return null;
}

const geocodeAddress = async (address: string) => {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
    address
  )}&countryCode=BGR&maxLocations=1`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ location?: { x: number; y: number } }>;
  };
  const candidate = payload.candidates?.[0];
  const location = candidate?.location;
  if (!location) {
    return null;
  }
  return { lat: location.y, lng: location.x };
};

const calculateDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aVal = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const cVal = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return earthRadiusKm * cVal;
};

const getAddressKey = (address: string) => address.trim();

interface DriverViewProps {
  userEmail: string;
  currentDriver: Driver;
  onLogout: () => Promise<void> | void;
}

export default function DriverView({ userEmail, currentDriver, onLogout }: DriverViewProps) {
  const [driverActionClientId, setDriverActionClientId] = useState<string | null>(null);
  const [driverClients, setDriverClients] = useState<Client[]>([]);
  const [driverClientsLoading, setDriverClientsLoading] = useState(false);
  const [driverClientsError, setDriverClientsError] = useState<string | null>(null);
  const [geoCache, setGeoCache] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentClient, setIncidentClient] = useState<Client | null>(null);

  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureClient, setSignatureClient] = useState<Client | null>(null);

  const [isShiftActive, setIsShiftActive] = useState<boolean>(() => {
    try {
      const stored = getStoredShift();
      return stored?.isActive === true;
    } catch {
      return false;
    }
  });

  const [shiftStartTime, setShiftStartTime] = useState<string | null>(() => {
    try {
      const stored = getStoredShift();
      return stored?.startTime ?? null;
    } catch {
      return null;
    }
  });

  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<{
    startTime: string;
    endTime: string;
    duration: string;
    deliveredCount: number;
    issueCount: number;
    pendingCount: number;
    totalDistanceKm: number;
  } | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      const data = await getScheduleItems();
      setScheduleItems(data);
    } catch (err) {
      console.error('Неуспешно зареждане на графика.', err);
    }
  }, []);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    let isMounted = true;

    const fetchDriverClients = async () => {
      setDriverClientsLoading(true);
      setDriverClientsError(null);
      try {
        const data = await getClients();
        if (isMounted) {
          setDriverClients(data);
        }
      } catch (err) {
        if (isMounted) {
          setDriverClientsError('Неуспешно зареждане на клиентите за маршрута.');
        }
      } finally {
        if (isMounted) {
          setDriverClientsLoading(false);
        }
      }
    };

    void fetchDriverClients();

    return () => {
      isMounted = false;
    };
  }, [currentDriver.id]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocationLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      position => {
        setCurrentPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocationLoading(false);
      },
      error => {
        console.warn('Неуспешно определяне на текуща позиция.', error);
        setIsLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const driverClientMap = useMemo(
    () =>
      driverClients.reduce<Record<string, Client>>((acc, client) => {
        acc[client.id] = client;
        return acc;
      }, {}),
    [driverClients]
  );

  const driverVisits = useMemo(() => {
    return scheduleItems
      .filter(item => item.driverId === currentDriver.id)
      .map(item => {
        const visitDate = new Date(item.date);
        if (Number.isNaN(visitDate.getTime())) {
          return null;
        }
        const client = driverClientMap[item.clientId];
        if (!client) {
          return null;
        }
        return { client, schedule: item, date: visitDate } as DriverVisit;
      })
      .filter((entry): entry is DriverVisit => entry !== null);
  }, [scheduleItems, currentDriver.id, driverClientMap]);

  const todayVisits = useMemo(
    () => driverVisits.filter(entry => isSameDay(entry.date, new Date())),
    [driverVisits]
  );

  const visitAddresses = useMemo(() => {
    return todayVisits
      .map(visit => getAddressKey(visit.client.address))
      .filter(address => address.length > 0);
  }, [todayVisits]);

  const addressesToGeocode = useMemo(() => {
    return visitAddresses.filter(address => geoCache[address] === undefined);
  }, [visitAddresses, geoCache]);

  useEffect(() => {
    if (addressesToGeocode.length === 0) {
      return;
    }

    let isActive = true;

    const fetchCoordinates = async () => {
      const results = await Promise.all(
        addressesToGeocode.map(async address => ({
          address,
          coords: await geocodeAddress(address)
        }))
      );

      if (!isActive) {
        return;
      }

      setGeoCache(prev => {
        const updated = { ...prev };
        results.forEach(result => {
          updated[result.address] = result.coords;
        });
        return updated;
      });
    };

    void fetchCoordinates();

    return () => {
      isActive = false;
    };
  }, [addressesToGeocode]);

  const tomorrowVisits = useMemo(
    () => driverVisits.filter(entry => isTomorrow(entry.date) && !isSameDay(entry.date, new Date())),
    [driverVisits]
  );

  const deliveredTodayCount = useMemo(() => {
    return todayVisits.filter(visit => 
      Boolean(
        visit.client.clientSignature ||
        visit.client.lastSignature ||
        visit.client.driverSignature ||
        visit.client.lastCheckIn?.trim()
      )
    ).length;
  }, [todayVisits]);

  const pendingTodayCount = useMemo(() => {
    return todayVisits.filter(visit => 
      !Boolean(
        visit.client.clientSignature ||
        visit.client.lastSignature ||
        visit.client.driverSignature ||
        visit.client.lastCheckIn?.trim()
      )
    ).length;
  }, [todayVisits]);

  // Helper to check if entry is an issue
  const isIssueEntry = useCallback((lastCheckIn: string | undefined): boolean => {
    if (!lastCheckIn) return false;
    const normalized = lastCheckIn.trim().toUpperCase();
    return normalized.startsWith('INCIDENT:') || normalized.startsWith('SOS ');
  }, []);

  // Count issues today (for display in modals)
  const issueTodayCount = useMemo(() => {
    return todayVisits.filter(visit => 
      isIssueEntry(visit.client.lastCheckIn)
    ).length;
  }, [todayVisits, isIssueEntry]);

  // Count actual delivered today (excluding issues)
  const actualDeliveredTodayCount = useMemo(() => {
    return todayVisits.filter(visit => {
      const hasEntry = Boolean(
        visit.client.clientSignature ||
        visit.client.lastSignature ||
        visit.client.driverSignature ||
        visit.client.lastCheckIn?.trim()
      );
      return hasEntry && !isIssueEntry(visit.client.lastCheckIn);
    }).length;
  }, [todayVisits, isIssueEntry]);

  const optimizedTodayVisitsWithMeta = useMemo(() => {
    const visitsWithCoords = todayVisits.map(visit => {
      const coords = geoCache[getAddressKey(visit.client.address)];
      return { ...visit, coords };
    });

    // Keep original order (no sequenceNumber available on ScheduleItem)
    const sorted = visitsWithCoords;

    // Calculate distances from previous point (starting from driver's current position)
    let previousCoords = currentPosition;
    return sorted.map((visit, index) => {
      let distanceFromPreviousKm: number | null = null;
      if (visit.coords && previousCoords) {
        distanceFromPreviousKm = calculateDistance(previousCoords, visit.coords);
      }
      if (visit.coords) {
        previousCoords = visit.coords;
      }
      return {
        ...visit,
        sequenceNumber: index + 1,
        distanceFromPreviousKm
      };
    });
  }, [todayVisits, geoCache, currentPosition]);

  const totalGpsDistanceKm = useMemo(() => {
    return optimizedTodayVisitsWithMeta.reduce((total, visit) => {
      const isDelivered = Boolean(
        visit.client.clientSignature ||
        visit.client.lastSignature ||
        visit.client.driverSignature ||
        visit.client.lastCheckIn?.trim()
      );
      if (isDelivered && visit.distanceFromPreviousKm) {
        return total + visit.distanceFromPreviousKm;
      }
      return total;
    }, 0);
  }, [optimizedTodayVisitsWithMeta]);

  const mapCoordinates = useMemo(() => {
    return optimizedTodayVisitsWithMeta
      .filter(visit => visit.coords)
      .map(visit => ({ visit, coords: visit.coords! }));
  }, [optimizedTodayVisitsWithMeta]);

  const mapBoundsPoints = useMemo(() => {
    return mapCoordinates.map(({ coords }) => coords);
  }, [mapCoordinates]);

  const mapFallbackCenter = useMemo(() => {
    if (currentPosition) return currentPosition;
    if (mapBoundsPoints.length > 0) return mapBoundsPoints[0];
    return { lat: 42.7, lng: 23.32 }; // Default to Sofia, Bulgaria
  }, [currentPosition, mapBoundsPoints]);

  const upcomingVisits = useMemo(
    () => driverVisits.filter(entry => isAfterTomorrow(entry.date)),
    [driverVisits]
  );

  const toRouteVisit = (visits: DriverVisit[]) => {
    return visits.map(visit => ({
      client: visit.client,
      schedule: visit.schedule,
      date: visit.date,
      sequenceNumber: (visit as any).sequenceNumber,
      distanceFromPreviousKm: (visit as any).distanceFromPreviousKm
    }));
  };

  const handleDriverCheckIn = async (clientId: string, driverSig: string, clientSig: string) => {
    setDriverActionClientId(clientId);
    setDriverClientsError(null);
    
    try {
      const targetClient = driverClients.find(c => c.id === clientId);
      const clientCoords = geoCache[getAddressKey(targetClient?.address || '')];

      await updateClientSignatures(
        clientId,
        driverSig,
        clientSig,
        'Доставено и подписано от двете страни'
      );

      // ВНИМАНИЕ: Тук добавяме clientName
      await completeDelivery({
        clientId: clientId,
        clientName: targetClient?.name || '---',
        egn: targetClient?.egn || 'N/A',
        driverId: currentDriver.id,
        startLocation: currentPosition || { lat: 0, lng: 0 },
        endLocation: clientCoords || { lat: 0, lng: 0 },
        timestamp: new Date(),
        mealType: (targetClient as any)?.mealType || 'Стандартно меню',
        mealCount: Number((targetClient as any)?.mealCount) || 1
      } as any);

      console.log('Delivery history record successfully created for client:', clientId);

      const refreshed = await getClientsByDriver(currentDriver.id);
      setDriverClients(refreshed);

    } catch (err) {
      console.error("Грешка при финализиране на доставка:", err);
      setDriverClientsError('Неуспешно записване на посещението в историята.');
    } finally {
      setDriverActionClientId(null);
    }
  };

  const handleOpenIncident = (client: Client | null | undefined) => {
    if (!client) {
      console.warn('Cannot open incident: no client provided');
      return;
    }
    if (!isShiftActive) {
      alert('Моля, първо започнете смяната, за да подадете сигнал.');
      return;
    }
    setIncidentClient(client);
    setIsIncidentModalOpen(true);
  };

  const handleCloseIncidentModal = () => {
    setIncidentClient(null);
    setIsIncidentModalOpen(false);
  };

  const handleOpenSignatureModal = (client: Client) => {
    setSignatureClient(client);
    setDriverActionClientId(client.id);
    setIsSignatureModalOpen(true);
  };

  const handleCloseSignatureModal = () => {
    setSignatureClient(null);
    setIsSignatureModalOpen(false);
    setDriverActionClientId(null);
  };

  const handleIncidentReportSuccess = useCallback(async () => {
    try {
      const refreshed = await getClientsByDriver(currentDriver.id);
      setDriverClients(refreshed);
    } catch (err) {
      console.error('Неуспешно обновяване на клиентите след инцидент.', err);
    }
  }, [currentDriver.id]);

  const handleSubmitIncidentReport = useCallback(
    async (incidentType: string, description: string) => {
      if (!incidentClient) {
        alert('Моля, изберете клиент.');
        return;
      }

      if (!isShiftActive) {
        alert('Не можете да подавате сигнал без активна смяна.');
        return;
      }

      try {
        const incidentTimestamp = new Date().toISOString();

        await addIncident({
          clientId: incidentClient.id,
          driverId: currentDriver.id,
          type: incidentType,
          description
        });

        // ВНИМАНИЕ: Тук също добавяме clientName
        await completeDelivery({
          clientId: incidentClient.id,
          clientName: incidentClient.name || '---',
          egn: incidentClient?.egn || 'N/A',
          driverId: currentDriver.id,
          startLocation: currentPosition || { lat: 0, lng: 0 },
          endLocation: geoCache[getAddressKey(incidentClient?.address || '')] || { lat: 0, lng: 0 },
          timestamp: new Date(),
          mealType: (incidentClient as any)?.mealType || 'Стандартно меню',
          mealCount: 0,
          status: 'issue',
          issueType: incidentType,
          issueDescription: description
        } as any);

        await updateClientLastCheckIn(
          incidentClient.id,
          `INCIDENT: ${incidentType} ${incidentTimestamp}`
        );

        await handleIncidentReportSuccess();
        alert('✅ Сигналът е изпратен успешно!');
        handleCloseIncidentModal();
      } catch (err) {
        console.error('Failed to submit incident:', err);
        alert('Грешка при изпращане на сигнала.');
      }
    },
    [incidentClient, currentDriver?.id, handleIncidentReportSuccess, isShiftActive, currentPosition, geoCache]
  );

  const handleStartShift = async () => { // Добавяме async
  try {
    // 1. Първо записваме в базата данни (Firestore)
    if (currentDriver?.id) {
      await startShift(currentDriver.id); 
    }

    // 2. След това обновяваме локалното състояние (твоя оригинален код)
    const now = new Date().toISOString();
    setIsShiftActive(true);
    setShiftStartTime(now);
    setShowStartShiftModal(false);

    // 3. Запазваме в локалния сторидж за всеки случай
    saveShiftToStorage({
      isActive: true,
      startTime: now,
      deliveredCount: 0
    });

    console.log("✅ Смяната е отразена в базата и локално.");
  } catch (err) {
    console.error('Failed to start shift:', err);
    alert('Грешка при започване на смяната в базата. Моля, проверете интернета си.');
  }
};

  const handleEndShift = async () => {
    try {
      // 1. Първо затваряме смяната в Firestore
      if (currentDriver?.id) {
        await endShift(currentDriver.id);
        console.log("✅ Смяната е приключена в Firestore");
      }

      // 2. Изчисляваме статистиката за крайния модал (Summary)
      const endTime = new Date().toISOString();
      const duration = shiftStartTime ? formatDuration(shiftStartTime) : '—';

      const shiftStartDate = shiftStartTime ? new Date(shiftStartTime) : null;
      const shiftEndDate = new Date(endTime);

      const getDeliveryTimestamp = (lastCheckIn: string | undefined): Date | null => {
        if (!lastCheckIn) return null;
        const trimmed = lastCheckIn.trim();
        
        const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
        if (isoMatch) {
          const parsed = new Date(isoMatch[0]);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
        
        const parsed = new Date(trimmed);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };

      // Филтрираме задачите, направени по време на тази смяна
      const entriesDuringShift = (todayVisits ?? []).filter(visit => {
        if (!visit?.client) return false;
        
        const hasEntry = Boolean(
          visit.client.clientSignature ||
          visit.client.lastSignature ||
          visit.client.driverSignature ||
          visit.client.lastCheckIn?.trim()
        );
        
        if (!hasEntry) return false;

        const entryTime = getDeliveryTimestamp(visit.client.lastCheckIn);
        
        if (!entryTime) return false;
        if (!shiftStartDate) return false;
        
        return entryTime >= shiftStartDate && entryTime <= shiftEndDate;
      });

      const deliveredDuringShift = entriesDuringShift.filter(visit => 
        !isIssueEntry(visit.client.lastCheckIn)
      ).length;

      const issuesDuringShift = entriesDuringShift.filter(visit => 
        isIssueEntry(visit.client.lastCheckIn)
      ).length;

      const deliveredClientIds = new Set(
        entriesDuringShift
          .filter(visit => !isIssueEntry(visit.client.lastCheckIn))
          .map(v => v.client.id)
      );
      
      const distanceDuringShift = (optimizedTodayVisitsWithMeta ?? []).reduce((total, visit) => {
        if (!visit?.client) return total;
        if (!deliveredClientIds.has(visit.client.id)) return total;
        if (visit.distanceFromPreviousKm) {
          return total + visit.distanceFromPreviousKm;
        }
        return total;
      }, 0);

      const remainingPending = (todayVisits ?? []).filter(visit => {
        if (!visit?.client) return false;
        return !Boolean(
          visit.client.clientSignature ||
          visit.client.lastSignature ||
          visit.client.driverSignature ||
          visit.client.lastCheckIn?.trim()
        );
      }).length;

      // 3. Подготвяме данните за показване в модала
      setShiftSummary({
        startTime: shiftStartTime || endTime,
        endTime,
        duration,
        deliveredCount: deliveredDuringShift,
        issueCount: issuesDuringShift,
        pendingCount: remainingPending,
        totalDistanceKm: Math.round(distanceDuringShift * 10) / 10
      });

      // 4. Сменяме модалите
      setShowEndShiftModal(false);
      setShowSummaryModal(true);

    } catch (err) {
      console.error('Failed to end shift:', err);
      alert('Грешка при завършване на смяната. Моля, опитайте отново.');
    }
  }; 

  const handleConfirmSummary = () => {
    try {
      setIsShiftActive(false);
      setShiftStartTime(null);
      setShiftSummary(null);
      setShowSummaryModal(false);
      clearShiftFromStorage();
    } catch (err) {
      console.error('Failed to confirm summary:', err);
    }
  };

  const handleLogoutWithCheck = () => {
    if (isShiftActive) {
      const confirm = window.confirm('Имате активна смяна. Сигурни ли сте, че искате да излезете без да я завършите?');
      if (!confirm) return;
    }
    void onLogout();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex h-screen max-w-lg flex-col px-4 pb-6 pt-10">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">CareConnect Driver</p>
              <h1 className="mt-1 text-2xl font-bold">Здравей, {currentDriver?.name || userEmail}</h1>
              {currentDriver?.routeArea ? (
                <p className="mt-1 text-sm text-slate-400">
                  Маршрут: <span className="font-medium text-slate-100">{currentDriver.routeArea}</span>
                </p>
              ) : null}
              {isShiftActive && shiftStartTime ? (
                <p className="mt-1 text-xs text-emerald-400">
                  🟢 Смяна активна • {formatDuration(shiftStartTime)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleLogoutWithCheck}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Изход
            </button>
          </div>
        </header>

        {!isShiftActive ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-slate-400">За да видите маршрута си, първо започнете смяната.</p>
              <button
                type="button"
                onClick={handleStartShift}
                className="rounded-2xl bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-transform"
              >
                🚗 ЗАПОЧНИ СМЯНА
              </button>
            </div>
          </div>
        ) : (
          <>
          <div className="relative z-0 mb-4 h-64 rounded-2xl bg-slate-900/80 p-3 shadow-lg ring-1 ring-slate-800">
            <MapContainer
              center={[mapFallbackCenter.lat, mapFallbackCenter.lng]}
              zoom={12}
              className="h-full w-full rounded-xl"
            >
              <MapBoundsController
                coordinates={mapBoundsPoints}
                fallbackCenter={mapFallbackCenter}
                driverPosition={currentPosition}
              />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {currentPosition ? (
                <CircleMarker
                  center={[currentPosition.lat, currentPosition.lng]}
                  radius={10}
                  pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.4 }}
                />
              ) : null}
              {mapCoordinates.map(({ visit, coords }) => {
                const isDelivered = Boolean(
                  visit.client.clientSignature ||
                    visit.client.lastSignature ||
                    visit.client.driverSignature ||
                    visit.client.lastCheckIn
                );
                return (
                  <Marker
                    key={visit.client.id}
                    position={[coords.lat, coords.lng]}
                    icon={isDelivered ? deliveredMarkerIcon : pendingMarkerIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">{visit.client.name}</p>
                        <p className="text-slate-600">{visit.client.address}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Статус: {isDelivered ? 'Доставено' : 'Предстои'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Твоят маршрут</h2>
            {driverClientsLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
          </div>

          {isLocationLoading ? (
            <p className="mb-3 rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-800">
              Определяне на текущата позиция...
            </p>
          ) : null}

          {driverClientsError ? (
            <p className="mb-3 rounded-lg bg-red-900/40 px-3 py-2 text-xs text-red-200">{driverClientsError}</p>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto pb-20">
            {driverClientsLoading ? (
              <p className="text-sm text-slate-500">Зареждане на клиентите по маршрута...</p>
            ) : !driverVisits || driverVisits.length === 0 ? (
              <p className="text-sm text-slate-500">
                Нямате планирани посещения. Проверете графика си или се свържете с администратора.
              </p>
            ) : (
              <DriverRoute
                todayVisits={toRouteVisit(optimizedTodayVisitsWithMeta ?? [])}
                tomorrowVisits={toRouteVisit(tomorrowVisits ?? [])}
                upcomingVisits={toRouteVisit(upcomingVisits ?? [])}
                driverActionClientId={driverActionClientId}
                onCheckIn={client => client && handleOpenSignatureModal(client)}
                onIncident={client => handleOpenIncident(client)}
                renderLastCheckInStatus={renderLastCheckInStatus}
                isShiftActive={isShiftActive}
              />
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent p-4">
            <div className="mx-auto max-w-lg">
              <button
                type="button"
                onClick={() => setShowEndShiftModal(true)}
                className="w-full rounded-2xl bg-red-600 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-red-500 active:scale-95 transition-transform"
              >
                🛑 ЗАВЪРШИ СМЯНА
              </button>
            </div>
          </div>
          </>
        )}
      </section>

      {showStartShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-white">Започване на смяна</h3>
            <p className="mb-6 text-sm text-slate-400">
              Сигурни ли сте, че искате да започнете смяната?
            </p>
            <div className="mb-4 rounded-lg bg-slate-800 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Доставени днес:</span>
                <span className="font-bold text-emerald-400">{deliveredTodayCount}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-400">Оставащи задачи:</span>
                <span className="font-bold text-amber-400">{pendingTodayCount}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowStartShiftModal(false)}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Отказ
              </button>
              <button
                type="button"
                onClick={handleStartShift}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
              >
                Започни
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-white">Завършване на смяна</h3>
            <p className="mb-6 text-sm text-slate-400">
              Прегледайте статуса преди да завършите смяната:
            </p>
            <div className="mb-4 space-y-4 rounded-lg bg-slate-800 p-4">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-emerald-300">Доставени:</span>
                <span className="text-2xl font-bold text-emerald-400">{actualDeliveredTodayCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-amber-300">С проблем:</span>
                <span className={`text-2xl font-bold ${issueTodayCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {issueTodayCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-t border-slate-700 pt-3">
                <span className="text-sm font-bold text-red-500">Оставащи:</span>
                <span className="text-2xl font-bold text-red-500">{pendingTodayCount}</span>
              </div>
            </div>
            
            {pendingTodayCount > 0 && (
              <div className="mb-4 rounded-lg bg-red-900/30 p-3 text-xs text-red-200">
                ⚠️ Имате {pendingTodayCount} недовършени задачи. Сигурни ли сте, че искате да завършите?
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndShiftModal(false)}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                ← Назад
              </button>
              <button
                type="button"
                onClick={handleEndShift}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
              >
                Завърши смяната
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && shiftSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-6 text-center text-xl font-bold text-slate-900">📋 Дневен отчет</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Начало на смяната:</span>
                <span className="font-medium text-slate-900">
                  {new Date(shiftSummary.startTime).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Край на смяната:</span>
                <span className="font-medium text-slate-900">
                  {new Date(shiftSummary.endTime).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Продължителност на смяната:</span>
                <span className="font-bold text-blue-600">{shiftSummary.duration}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-emerald-600">Доставени порции:</span>
                <span className="text-2xl font-bold text-emerald-600">{shiftSummary.deliveredCount}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="font-medium text-amber-500">Докладвани проблеми:</span>
                <span className={`text-xl font-bold ${shiftSummary.issueCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {shiftSummary.issueCount}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-3 pt-1">
                <span className="font-bold text-red-600">Неизпълнени задачи:</span>
                <span className="text-2xl font-bold text-red-600">{shiftSummary.pendingCount}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-600">Общо изминати км (GPS):</span>
                <span className="font-bold text-blue-600">{shiftSummary.totalDistanceKm} км</span>
              </div>
            </div>

            {shiftSummary.issueCount > 0 && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                ⚠️ Докладвани са {shiftSummary.issueCount} проблема по време на смяната.
              </div>
            )}

            {shiftSummary.pendingCount > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                ⚠️ Имате {shiftSummary.pendingCount} неизпълнени доставки за днес.
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmSummary}
              className="mt-8 w-full rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white shadow hover:bg-emerald-500"
            >
              ✓ Потвърди и изпрати
            </button>
          </div>
        </div>
      )}

      {isIncidentModalOpen && incidentClient ? (
        <IncidentReporter
          client={incidentClient}
          onClose={handleCloseIncidentModal}
          onSubmitReport={handleSubmitIncidentReport}
        />
      ) : null}

      <SignatureModal
        isOpen={isSignatureModalOpen}
        client={signatureClient}
        onCancel={handleCloseSignatureModal}
        onComplete={async (driverSig, clientSig) => {
          if (!signatureClient) {
            return;
          }
          await handleDriverCheckIn(signatureClient.id, driverSig, clientSig);
        }}
        
      />
    </main>
  );
}
