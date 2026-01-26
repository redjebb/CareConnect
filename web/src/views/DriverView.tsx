import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Client, Driver, ScheduleItem } from '../types';
import { getClients, getClientsByDriver, updateClientLastCheckIn, updateClientSignatures } from '../clientService';
import { getScheduleItems } from '../scheduleService';
import { addIncident } from '../incidentService';
import IncidentReporter from '../IncidentReporter';
import DriverRoute, { DriverVisit as DriverVisitCard } from '../components/DriverRoute';
import SignatureModal from '../components/SignatureModal';
import {completeDelivery} from '../services/deliveryService';

type DriverVisit = {
  client: Client;
  schedule: ScheduleItem;
  date: Date;
  sequenceNumber?: number;
  distanceFromPreviousKm?: number | null;
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

  const upcomingVisits = useMemo(() => {
    return driverVisits
      .filter(
        entry =>
          !isSameDay(entry.date, new Date()) &&
          !isTomorrow(entry.date) &&
          isAfterTomorrow(entry.date)
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [driverVisits]);

  const optimizedTodayVisits = useMemo(() => {
    if (todayVisits.length <= 1) {
      return todayVisits;
    }

    if (isLocationLoading && !currentPosition) {
      return todayVisits;
    }

    const coordsMap = geoCache;
    const visitsWithCoords = todayVisits.filter(
      visit => coordsMap[getAddressKey(visit.client.address)] != null
    );
    const visitsWithoutCoords = todayVisits.filter(
      visit => coordsMap[getAddressKey(visit.client.address)] == null
    );

    if (visitsWithCoords.length <= 1) {
      return todayVisits;
    }

    const remaining = [...visitsWithCoords];
    const ordered: DriverVisit[] = [];

    let lastCoords = currentPosition;
    if (lastCoords) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((visit, index) => {
        const coords = coordsMap[getAddressKey(visit.client.address)];
        if (!coords) {
          return;
        }
        const distance = calculateDistance(lastCoords as { lat: number; lng: number }, coords);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const first = remaining.splice(nearestIndex, 1)[0];
      ordered.push(first);
      lastCoords = coordsMap[getAddressKey(first.client.address)] ?? lastCoords;
    } else {
      const first = remaining.shift();
      if (first) {
        ordered.push(first);
        lastCoords = coordsMap[getAddressKey(first.client.address)] ?? null;
      }
    }

    while (remaining.length > 0) {
      if (!lastCoords) {
        ordered.push(remaining.shift()!);
        continue;
      }

      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((visit, index) => {
        const coords = coordsMap[getAddressKey(visit.client.address)];
        if (!coords) {
          return;
        }
        const distance = calculateDistance(lastCoords as { lat: number; lng: number }, coords);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const nextVisit = remaining.splice(nearestIndex, 1)[0];
      ordered.push(nextVisit);
      lastCoords = coordsMap[getAddressKey(nextVisit.client.address)] ?? lastCoords;
    }

    return [...ordered, ...visitsWithoutCoords];
  }, [todayVisits, geoCache, currentPosition, isLocationLoading]);

  const optimizedTodayVisitsWithMeta = useMemo(() => {
    if (optimizedTodayVisits.length === 0) {
      return [] as DriverVisit[];
    }

    let previousCoords = currentPosition;
    return optimizedTodayVisits.map((visit, index) => {
      const coords = geoCache[getAddressKey(visit.client.address)] ?? null;
      let distanceFromPreviousKm: number | null = null;
      if (previousCoords && coords) {
        distanceFromPreviousKm = calculateDistance(previousCoords, coords);
      }

      if (coords) {
        previousCoords = coords;
      }

      return {
        ...visit,
        sequenceNumber: index + 1,
        distanceFromPreviousKm
      };
    });
  }, [optimizedTodayVisits, geoCache, currentPosition]);

  const toRouteVisit = (visits: DriverVisit[]): DriverVisitCard[] =>
    visits.map(entry => ({
      client: entry.client,
      date: entry.date,
      sequenceNumber: entry.sequenceNumber,
      distanceFromPreviousKm: entry.distanceFromPreviousKm
    }));

  const mapVisits = optimizedTodayVisitsWithMeta;
  const mapCoordinates = useMemo(() => {
    return mapVisits
      .map(visit => ({
        visit,
        coords: geoCache[getAddressKey(visit.client.address)]
      }))
      .filter(item => item.coords != null) as Array<{
      visit: DriverVisit;
      coords: { lat: number; lng: number };
    }>;
  }, [mapVisits, geoCache]);

  const mapFallbackCenter = useMemo(() => ({ lat: 42.6977, lng: 23.3219 }), []);
  const mapBoundsPoints = useMemo(() => mapCoordinates.map(item => item.coords), [mapCoordinates]);

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

      await completeDelivery({
        clientId: clientId,
        egn: targetClient?.egn || 'N/A',
        driverId: currentDriver.id,
        startLocation: currentPosition || { lat: 0, lng: 0 },
        endLocation: clientCoords || { lat: 0, lng: 0 },
        timestamp: new Date(),
        mealType: (targetClient as any)?.mealType || 'Стандартно меню',
        mealCount: Number((targetClient as any)?.mealCount) || 1
      });

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

  const handleOpenIncident = (client: Client) => {
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
        throw new Error('Липсват данни за клиента.');
      }

      const incidentTimestamp = new Date().toISOString();

      await addIncident({
        clientId: incidentClient.id,
        driverId: currentDriver.id,
        type: incidentType,
        description
      });

      await updateClientLastCheckIn(
        incidentClient.id,
        `INCIDENT: ${incidentType} ${incidentTimestamp}`
      );

      await handleIncidentReportSuccess();
    },
    [incidentClient, currentDriver.id, handleIncidentReportSuccess]
  );

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
            </div>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Изход
            </button>
          </div>
        </header>

        <div className="relative z-0 mb-4 rounded-2xl bg-slate-900/80 p-3 shadow-lg ring-1 ring-slate-800">
          <div className="h-64 w-full overflow-hidden rounded-xl">
            <MapContainer center={[mapFallbackCenter.lat, mapFallbackCenter.lng]} zoom={12} className="h-full w-full">
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
                          Статус: {isDelivered ? 'Delivered' : 'Pending'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
          <p className="mt-2 text-xs text-slate-400">Маркерите са зелени при доставено, сини при предстоящо.</p>
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

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {driverClientsLoading ? (
            <p className="text-sm text-slate-500">Зареждане на клиентите по маршрута...</p>
          ) : driverVisits.length === 0 ? (
            <p className="text-sm text-slate-500">
              Нямате планирани посещения. Проверете графика си или се свържете с администратора.
            </p>
          ) : (
            <DriverRoute
              todayVisits={toRouteVisit(optimizedTodayVisitsWithMeta)}
              tomorrowVisits={toRouteVisit(tomorrowVisits)}
              upcomingVisits={toRouteVisit(upcomingVisits)}
              driverActionClientId={driverActionClientId}
              onCheckIn={client => handleOpenSignatureModal(client)}
              onIncident={client => handleOpenIncident(client)}
              renderLastCheckInStatus={renderLastCheckInStatus}
            />
          )}
        </div>
      </section>

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
