import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch // ВАЖНО: за групово изтриване
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

// --- ОБНОВЕНА ФУНКЦИЯ ЗА ПЪЛНО ИЗТРИВАНЕ ---
export async function deleteClient(id: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Изтриваме основния документ на клиента
    const clientRef = doc(db, 'clients', id);
    batch.delete(clientRef);

    // 2. Намираме и добавяме за изтриване ГРАФИКА му
    const scheduleQuery = query(collection(db, 'schedule'), where('clientId', '==', id));
    const scheduleSnap = await getDocs(scheduleQuery);
    scheduleSnap.forEach((doc) => batch.delete(doc.ref));

    // 3. Намираме и добавяме за изтриване ИСТОРИЯТА на доставките му
    const historyQuery = query(collection(db, 'deliveryHistory'), where('clientId', '==', id));
    const historySnap = await getDocs(historyQuery);
    historySnap.forEach((doc) => batch.delete(doc.ref));

    // 4. Намираме и добавяме за изтриване ИНЦИДЕНТИТЕ му
    const incidentQuery = query(collection(db, 'incidents'), where('clientId', '==', id));
    const incidentSnap = await getDocs(incidentQuery);
    incidentSnap.forEach((doc) => batch.delete(doc.ref));

    // Изпълняваме всичко наведнъж
    await batch.commit();
    console.log(`✅ Клиент ${id} и всички негови записи са изтрити напълно.`);
  } catch (error) {
    console.error("Грешка при пълно изтриване:", error);
    throw error;
  }
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