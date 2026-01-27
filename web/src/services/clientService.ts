import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Client, ClientHistoryEntry } from '../types';

const clientsCollection = collection(db, 'clients');

export async function addClient(client: Omit<Client, 'id'>): Promise<string> {
  const docRef = await addDoc(clientsCollection, client);
  return docRef.id;
}

export async function getClients(): Promise<Client[]> {
  const snapshot = await getDocs(clientsCollection);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<Client, 'id'>;
    return {
      id: docSnapshot.id,
      ...data,
      mealCount: typeof data.mealCount === 'number' ? data.mealCount : Number(data.mealCount) || 1,
      notes: data.notes ?? '',
      lastCheckIn: data.lastCheckIn ?? ''
    };
  });
}

export async function getClientsByDriver(driverId: string): Promise<Client[]> {
  const clientsQuery = query(clientsCollection, where('assignedDriverId', '==', driverId));
  const snapshot = await getDocs(clientsQuery);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<Client, 'id'>;
    return {
      id: docSnapshot.id,
      ...data,
      mealCount: typeof data.mealCount === 'number' ? data.mealCount : Number(data.mealCount) || 1,
      notes: data.notes ?? '',
      lastCheckIn: data.lastCheckIn ?? ''
    };
  });
}

export async function getClientHistory(egn: string): Promise<ClientHistoryEntry[]> {
  const trimmedEgn = egn.trim();
  if (!trimmedEgn) {
    return [];
  }

  const historyQuery = query(clientsCollection, where('egn', '==', trimmedEgn));
  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<ClientHistoryEntry, 'id'>;
    return {
      id: docSnapshot.id,
      ...data,
      mealCount: typeof data.mealCount === 'number' ? data.mealCount : Number(data.mealCount) || 1,
      notes: data.notes ?? '',
      lastCheckIn: data.lastCheckIn ?? ''
    };
  });
}

export async function deleteClient(id: string, deleteHistory: boolean = false): Promise<void> {
  const batch = writeBatch(db);

  // 1. Delete the client document
  const clientDoc = doc(db, 'clients', id);
  batch.delete(clientDoc);

  // 2. Delete all schedule items for this client
  const scheduleCollection = collection(db, 'schedule');
  const scheduleQuery = query(scheduleCollection, where('clientId', '==', id));
  const scheduleSnapshot = await getDocs(scheduleQuery);
  scheduleSnapshot.docs.forEach(docSnapshot => {
    batch.delete(doc(db, 'schedule', docSnapshot.id));
  });

  // 3. Optionally delete delivery history for this client
  if (deleteHistory) {
    const deliveryHistoryCollection = collection(db, 'deliveryHistory');
    const historyQuery = query(deliveryHistoryCollection, where('clientId', '==', id));
    const historySnapshot = await getDocs(historyQuery);
    historySnapshot.docs.forEach(docSnapshot => {
      batch.delete(doc(db, 'deliveryHistory', docSnapshot.id));
    });
  }

  // Commit all deletions atomically
  await batch.commit();
}

export async function updateClientLastCheckIn(id: string, lastCheckIn: string): Promise<void> {
  const clientDoc = doc(db, 'clients', id);
  await updateDoc(clientDoc, { lastCheckIn });
}

export async function updateClientSignatures(
  id: string,
  driverSignature: string,
  clientSignature: string,
  lastCheckIn: string
): Promise<void> {
  const clientDoc = doc(db, 'clients', id);
  await updateDoc(clientDoc, {
    driverSignature,
    clientSignature,
    lastSignature: clientSignature,
    lastCheckIn
  });
}

export async function deleteDeliveryFromHistory(clientId: string, date: Date): Promise<void> {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const deliveryHistoryCollection = collection(db, 'deliveryHistory');
  const historyQuery = query(
    deliveryHistoryCollection,
    where('clientId', '==', clientId),
    where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
    where('timestamp', '<=', Timestamp.fromDate(endOfDay))
  );

  const snapshot = await getDocs(historyQuery);
  
  const deletePromises = snapshot.docs.map(docSnapshot => 
    deleteDoc(doc(db, 'deliveryHistory', docSnapshot.id))
  );

  await Promise.all(deletePromises);
}
