/*
 * CareConnect - Платформа за Домашен Социален Патронаж
 * Copyright (C) 2026 Адам Биков , Реджеб Туджар
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


import { addDoc, collection, doc, getDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Driver } from '../types';

const driversCollection = collection(db, 'drivers');

export async function addDriver(driver: Omit<Driver, 'id'>): Promise<string> {
  const { name, email, phone, routeArea } = driver;
  const docRef = await addDoc(driversCollection, {
    name,
    email: email.trim().toLowerCase(),
    phone,
    routeArea,
    status: driver.status ?? 'pending',
    role: 'DRIVER'
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

// Cascading delete: removes driver and all related schedule, shifts, and invitation records
export async function deleteDriver(id: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    const driverDocRef = doc(driversCollection, id);
    const driverSnap = await getDocs(query(driversCollection, where('__name__', '==', id)));
    const driverData = !driverSnap.empty ? driverSnap.docs[0].data() : null;

    batch.delete(driverDocRef);

    const scheduleQuery = query(collection(db, 'schedule'), where('driverId', '==', id));
    const scheduleSnapshot = await getDocs(scheduleQuery);
    scheduleSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    const shiftsQuery = query(collection(db, 'shifts'), where('driverId', '==', id));
    const shiftsSnapshot = await getDocs(shiftsQuery);
    shiftsSnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    if (driverData && driverData.email) {
      batch.delete(doc(db, 'invitations', String(driverData.email).trim().toLowerCase()));
    }

    await batch.commit();
    console.log(`✅ Шофьор ${id} и всички свързани данни са изтрити напълно.`);

  } catch (error) {
    console.error("Грешка при пълно изтриване на шофьор:", error);
    throw error;
  }
}

export async function getDriverById(id: string): Promise<Driver | null> {
  const snapshot = await getDoc(doc(driversCollection, id));
  if (!snapshot.exists()) {
    return null;
  }
  return { id: snapshot.id, ...(snapshot.data() as Omit<Driver, 'id'>) };
}
