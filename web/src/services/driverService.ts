import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Driver } from '../types';

const driversCollection = collection(db, 'drivers');

export async function addDriver(driver: Omit<Driver, 'id'>): Promise<string> {
  const { name, email, phone, routeArea } = driver;
  const docRef = await addDoc(driversCollection, {
    name,
    email,
    phone,
    routeArea
  });
  return docRef.id;
}

export async function getDrivers(): Promise<Driver[]> {
  const snapshot = await getDocs(driversCollection);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<Driver, 'id'>;
    return {
      id: docSnapshot.id,
      ...data
    };
  });
}

export async function deleteDriver(id: string): Promise<void> {
  const driverDoc = doc(driversCollection, id);
  await deleteDoc(driverDoc);
}

export async function getDriverByEmail(email: string): Promise<Driver | null> {
  const driverQuery = query(driversCollection, where('email', '==', email));
  const snapshot = await getDocs(driverQuery);

  if (snapshot.empty) {
    return null;
  }

  const docSnapshot = snapshot.docs[0];
  const data = docSnapshot.data() as Omit<Driver, 'id'>;

  return {
    id: docSnapshot.id,
    ...data
  };
}
