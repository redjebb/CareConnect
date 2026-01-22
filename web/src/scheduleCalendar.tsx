import React, { useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Client, Driver, ScheduleItem } from './types'; // Import real types

// Helper to format a Date object into a clean 'YYYY-MM-DD' string key
const formatDateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Helper to format the ScheduleItem date string into a clean 'YYYY-MM-DD' key
const normalizeScheduleDate = (value: string): string => {
  // Handles ISO strings or simple YYYY-MM-DD strings
  return value.substring(0, 10);
};

type TileArgs = {
  date: Date;
  view: 'month' | 'year' | 'decade' | 'century';
};

interface ScheduleCalendarProps {
  scheduleItems: ScheduleItem[]; // REAL DATA
  clients: Client[]; // REAL DATA
  drivers: Driver[]; // REAL DATA
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ 
  scheduleItems, 
  clients, 
  drivers, 
  selectedDate, 
  onDateChange 
}) => {

  const formatClientCount = (count: number) => {
    if (count === 0) {
      return 'Няма клиенти';
    }
    if (count === 1) {
      return '1 клиент';
    }
    return `${count} клиента`;
  };

  // Map clients and drivers for quick lookup
  const clientMap = useMemo(() => {
    return clients.reduce<Record<string, Client>>((acc, client) => {
      acc[client.id] = client;
      return acc;
    }, {});
  }, [clients]);

  const driverMap = useMemo(() => {
    return drivers.reduce<Record<string, Driver>>((acc, driver) => {
      acc[driver.id] = driver;
      return acc;
    }, {});
  }, [drivers]);

  // Map of all dates that have assignments (for highlighting tiles)
  const datesWithTasks = useMemo(
    () => new Set(scheduleItems.map(item => normalizeScheduleDate(item.date))),
    [scheduleItems]
  );

  // Filter and enrich schedule items for the selected date
  const clientsForSelectedDate = useMemo(() => {
    const selectedDateKey = formatDateToKey(selectedDate);
    return scheduleItems
      .filter(item => normalizeScheduleDate(item.date) === selectedDateKey)
      .map(item => {
        const client = clientMap[item.clientId];
        const driver = driverMap[item.driverId];
        return {
          ...item,
          clientName: client?.name ?? 'Неналичен клиент',
          address: client?.address ?? '',
          phone: client?.phone ?? '',
          driverName: driver?.name ?? 'Неназначен',
          routeArea: driver?.routeArea ?? 'N/A'
        };
      });
  }, [scheduleItems, selectedDate, clientMap, driverMap]);

  const handleTileContent = ({ date, view }: TileArgs) => {
    if (view !== 'month') {
      return null;
    }

    const tileKey = formatDateToKey(date);
    if (!datesWithTasks.has(tileKey)) {
      return null;
    }

    // Displays a dot on days with tasks
    return <span className="mt-1 inline-block h-1.5 w-1.5 translate-x-1 rounded-full bg-emerald-500" />;
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-500">Календар на маршрутите</p>
          <h2 className="text-2xl font-bold text-slate-900">График за шофьорите</h2>
          <p className="text-sm text-slate-500">
            Изберете дата, за да видите кои клиенти са назначени за посещение.
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <Calendar
            onChange={value => onDateChange(value as Date)}
            value={selectedDate}
            tileContent={handleTileContent}
            minDetail="month"
            maxDetail="month"
            showNeighboringMonth={false}
            locale="bg-BG"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">Избрана дата</p>
            <h3 className="text-xl font-semibold text-slate-900">
              {selectedDate.toLocaleDateString('bg-BG', {
                weekday: 'long',
                day: '2-digit',
                month: 'long'
              })}
            </h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {formatClientCount(clientsForSelectedDate.length)}
          </span>
        </div>

        {clientsForSelectedDate.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Няма планирани посещения за тази дата. Добавете нов график, за да видите клиенти тук.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {clientsForSelectedDate.map(item => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-slate-400">Клиент</p>
                    <p className="text-lg font-semibold text-slate-900">{item.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Шофьор</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {item.driverName}
                    </p>
                    <p className="text-xs text-slate-500">{item.routeArea}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.address}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  Телефон: <span className="font-semibold text-slate-900">{item.phone || '—'}</span>
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ScheduleCalendar;