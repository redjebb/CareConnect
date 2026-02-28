import { addDoc, collection, deleteDoc, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from './firebase';
import { ScheduleItem } from '../types';

const scheduleCollection = collection(db, 'schedule');

const normalizeDateValue = (value: unknown): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString();
  }
  return '';
};

export interface ScheduleItemInput {
  clientId: string;
  driverId: string;
  date: string;
  assignedByAdminEmail?: string;
}

export async function addScheduleItem(item: ScheduleItemInput): Promise<string> {
  const payload = {
    ...item,
    createdAt: Timestamp.now()
  };

  const docRef = await addDoc(scheduleCollection, payload);
  return docRef.id;
}

export async function getScheduleItems(): Promise<ScheduleItem[]> {
  const snapshot = await getDocs(scheduleCollection);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<ScheduleItem, 'id'> & { date: unknown };
    const normalizedDate = normalizeDateValue(data.date);
    return {
      id: docSnapshot.id,
      ...data,
      date: normalizedDate,
      notes: data.notes ?? '',
      assignedByAdminEmail: data.assignedByAdminEmail || ''
    };
  });
}

export async function deleteScheduleByClient(clientId: string): Promise<void> {
  const scheduleQuery = query(scheduleCollection, where('clientId', '==', clientId));
  const snapshot = await getDocs(scheduleQuery);

  if (snapshot.empty) {
    return;
  }

  await Promise.all(snapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref)));
}
