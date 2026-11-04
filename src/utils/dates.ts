export const formatDuration = (startTime: string): string => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}ч ${minutes}мин`;
};

export const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export const isSameDay = (d1: Date, d2: Date) => startOfDay(d1).getTime() === startOfDay(d2).getTime();

export const isTomorrow = (date: Date) => {
  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
};

export const isAfterTomorrow = (date: Date) => {
  const dayAfterTomorrow = startOfDay(new Date());
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return date.getTime() >= dayAfterTomorrow.getTime();
};

