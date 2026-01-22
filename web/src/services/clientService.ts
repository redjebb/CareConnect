import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where
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

export async function deleteClient(id: string): Promise<void> {
  const clientDoc = doc(db, 'clients', id);
  await deleteDoc(clientDoc);
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
