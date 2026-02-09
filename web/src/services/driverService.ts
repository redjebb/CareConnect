import { addDoc, collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'; // Добавихме writeBatch
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

// ФУНКЦИЯ ЗА ИЗТРИВАНЕ:
export async function deleteDriver(id: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Първо намираме данните на шофьора, за да му вземем имейла
    const driverDocRef = doc(driversCollection, id);
    const driverSnap = await getDocs(query(driversCollection, where('__name__', '==', id)));
    const driverData = !driverSnap.empty ? driverSnap.docs[0].data() : null;

    // 2. Добавяме изтриването на самия шофьор в пакета (batch)
    batch.delete(driverDocRef);

    // 3. Намиране и изтриване на ГРАФИКА (schedule)
    const scheduleQuery = query(collection(db, 'schedule'), where('driverId', '==', id));
    const scheduleSnapshot = await getDocs(scheduleQuery);
    scheduleSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // 4. Намиране и изтриване на СМЕНИТЕ (shifts)
    const shiftsQuery = query(collection(db, 'shifts'), where('driverId', '==', id));
    const shiftsSnapshot = await getDocs(shiftsQuery);
    shiftsSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // 5. Намиране и изтриване на ПОКАНАТА (invitations) по имейл
    if (driverData && driverData.email) {
      const invQuery = query(collection(db, 'invitations'), where('email', '==', driverData.email));
      const invSnapshot = await getDocs(invQuery);
      invSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      console.log(`🧹 Изтрита покана за: ${driverData.email}`);
    }

    // Изпълняваме всичко наведнъж
    await batch.commit();
    console.log(`✅ Шофьор ${id} и всички свързани данни са изтрити напълно.`);

  } catch (error) {
    console.error("Грешка при пълно изтриване на шофьор:", error);
    throw error;
  }
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