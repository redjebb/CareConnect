import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ClientRegistryEntry } from '../types';

const registryCollection = collection(db, 'clients_registry');

export async function getRegistryEntries(): Promise<ClientRegistryEntry[]> {
  const snapshot = await getDocs(registryCollection);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<ClientRegistryEntry, 'id'>;
    return {
      id: docSnapshot.id,
      ...data,
      defaultMealCount: typeof data.defaultMealCount === 'number' ? data.defaultMealCount : 1
    };
  });
}

export async function addRegistryEntry(entry: Omit<ClientRegistryEntry, 'id'>) {
  const payload = {
    ...entry,
    egn: entry.egn.trim(),
    name: entry.name.trim(),
    address: entry.address.trim(),
    phone: entry.phone.trim(),
    defaultMealType: entry.defaultMealType.trim() || 'Стандартно меню',
    defaultMealCount: Math.max(1, Number(entry.defaultMealCount) || 1)
  };
  await addDoc(registryCollection, payload);
}

export async function updateRegistryEntry(
  id: string,
  data: Partial<Omit<ClientRegistryEntry, 'id'>>
) {
  const registryDoc = doc(db, 'clients_registry', id);
  const payload: Partial<Omit<ClientRegistryEntry, 'id'>> = {};

  if (data.egn !== undefined) {
    payload.egn = data.egn.trim();
  }
  if (data.name !== undefined) {
    payload.name = data.name.trim();
  }
  if (data.address !== undefined) {
    payload.address = data.address.trim();
  }
  if (data.phone !== undefined) {
    payload.phone = data.phone.trim();
  }
  if (data.defaultMealType !== undefined) {
    payload.defaultMealType = data.defaultMealType.trim() || 'Стандартно меню';
  }
  if (data.defaultMealCount !== undefined) {
    payload.defaultMealCount = Math.max(1, Number(data.defaultMealCount) || 1);
  }

  await updateDoc(registryDoc, payload);
}

export async function deleteRegistryEntry(id: string) {
  const registryDoc = doc(db, 'clients_registry', id);
  await deleteDoc(registryDoc);
}
