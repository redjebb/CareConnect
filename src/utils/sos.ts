import { ScheduleItem } from '../types';

// SOS alerts go to the dispatcher who planned the visit, never to a broadcast list.
export function resolveSosRecipient(
  schedule: Pick<ScheduleItem, 'clientId' | 'driverId' | 'assignedByAdminEmail'>[],
  clientId: string,
  driverId: string
): string | null {
  const item = schedule.find(s => s.clientId === clientId && s.driverId === driverId);
  const email = item?.assignedByAdminEmail?.trim();
  return email ? email : null;
}
