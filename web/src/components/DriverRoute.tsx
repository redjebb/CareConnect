import { ReactNode } from 'react';
import { Client } from '../types';

export type DriverVisit = {
  client: Client;
  date: Date;
  sequenceNumber?: number;
  distanceFromPreviousKm?: number | null;
};

interface DriverRouteProps {
  todayVisits: DriverVisit[];
  tomorrowVisits: DriverVisit[];
  upcomingVisits: DriverVisit[];
  driverActionClientId: string | null;
  onCheckIn: (client: Client) => void;
  onIncident: (client: Client) => void;
  renderLastCheckInStatus: (lastCheckIn: string | undefined) => ReactNode;
  isShiftActive?: boolean;
}

const formatVisitDateForCard = (date: Date) =>
  date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

const formatClientCount = (count: number) => {
  if (count === 0) {
    return 'Няма клиенти';
  }
  if (count === 1) {
    return '1 клиент';
  }
  return `${count} клиента`;
};

function VisitSection({
  title,
  visits,
  driverActionClientId,
  onCheckIn,
  onIncident,
  renderLastCheckInStatus,
  isShiftActive
}: {
  title: string;
  visits: DriverVisit[];
  driverActionClientId: string | null;
  onCheckIn: (client: Client) => void;
  onIncident: (client: Client) => void;
  renderLastCheckInStatus: (lastCheckIn: string | undefined) => ReactNode;
  isShiftActive: boolean;
}) {
  return (
    <section className="space-y-3 rounded-2xl bg-slate-900/60 p-4 shadow-lg ring-1 ring-slate-800" key={title}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs text-slate-400">{formatClientCount(visits.length)}</span>
      </div>
      {visits.length === 0 ? (
        <p className="text-sm text-slate-500">Няма посещения.</p>
      ) : (
        visits.map(({ client, date, sequenceNumber, distanceFromPreviousKm }) => (
          <article
            key={`${title}-${client.id}`}
            className="rounded-2xl bg-slate-900/80 p-4 shadow-inner ring-1 ring-slate-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  {sequenceNumber ? (
                    <span className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-full bg-blue-500/20 px-2 text-sm font-bold text-blue-200 ring-1 ring-blue-400/60">
                      #{sequenceNumber}
                    </span>
                  ) : null}
                  <h4 className="text-base font-semibold">{client.name}</h4>
                </div>
                <p className="mt-1 text-sm text-slate-300">{client.address}</p>
                {distanceFromPreviousKm != null ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {sequenceNumber === 1
                      ? distanceFromPreviousKm < 1
                        ? `на ${Math.round(distanceFromPreviousKm * 1000)}м от Вас`
                        : `на ${distanceFromPreviousKm.toFixed(1)} км от Вас`
                      : `на ${distanceFromPreviousKm.toFixed(1)} км от предишния адрес`}
                  </p>
                ) : null}
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100 ring-1 ring-amber-400/60">
                  <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
                  Доставка: {client.mealCount || 1}x {client.mealType || 'Стандартно меню'}
                </div>
                <div className="mt-2">{renderLastCheckInStatus(client.lastCheckIn)}</div>
              </div>
              {title === 'Предстоящи' ? (
                <div className="rounded-xl bg-slate-800 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-100">
                  {formatVisitDateForCard(date)}
                </div>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    client.address
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Google Maps
                </a>
                <a
                  href={`https://waze.com/ul?q=${encodeURIComponent(client.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Waze
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={driverActionClientId === client.id}
                  onClick={() => onCheckIn(client)}
                  className="rounded-xl bg-emerald-500 px-3 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
                >
                  {driverActionClientId === client.id ? 'Записване...' : 'Доставено / Check-in'}
                </button>
                <button
                  type="button"
                  disabled={driverActionClientId === client.id || !isShiftActive}
                  onClick={() => onIncident(client)}
                  className="rounded-xl bg-red-500 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/40 hover:bg-red-400 active:scale-[0.98] disabled:opacity-60"
                >
                  {driverActionClientId === client.id ? 'Изпращане...' : 'Проблем / SOS'}
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

export default function DriverRoute({
  todayVisits,
  tomorrowVisits,
  upcomingVisits,
  driverActionClientId,
  onCheckIn,
  onIncident,
  renderLastCheckInStatus,
  isShiftActive = true
}: DriverRouteProps) {
  return (
    <>
      <VisitSection
        title="Днес"
        visits={todayVisits}
        driverActionClientId={driverActionClientId}
        onCheckIn={onCheckIn}
        onIncident={onIncident}
        renderLastCheckInStatus={renderLastCheckInStatus}
        isShiftActive={isShiftActive}
      />
      <VisitSection
        title="Утре"
        visits={tomorrowVisits}
        driverActionClientId={driverActionClientId}
        onCheckIn={onCheckIn}
        onIncident={onIncident}
        renderLastCheckInStatus={renderLastCheckInStatus}
        isShiftActive={isShiftActive}
      />
      <VisitSection
        title="Предстоящи"
        visits={upcomingVisits}
        driverActionClientId={driverActionClientId}
        onCheckIn={onCheckIn}
        onIncident={onIncident}
        renderLastCheckInStatus={renderLastCheckInStatus}
        isShiftActive={isShiftActive}
      />
    </>
  );
}
