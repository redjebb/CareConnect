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


import {
  Timestamp,
  collection,
  getDocs,
  getFirestore,
  query,
  where
} from 'firebase/firestore';

const buildRange = (start: Date, end: Date) => ({
  start: Timestamp.fromDate(start),
  end: Timestamp.fromDate(end),
});

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

/**
 * Fetch deliveries for a client within a month.
 * Filters by date range in JavaScript to avoid Firestore index requirements.
 */
export async function getClientMonthlyReport(clientEgn: string, date: Date) {
  const db = getFirestore();
  
  try {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const q = query(
      collection(db, 'deliveryHistory'),
      where('egn', '==', clientEgn)
    );

    const snap = await getDocs(q);
    
    if (snap.empty) {
      return { deliveries: [] };
    }

    const deliveries = snap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp // Ensure timestamp is included
      }))
      .filter(delivery => {
        const ts = delivery.timestamp;
        if (!ts) return false;
        
        // Handle Firestore Timestamp or Date
        const deliveryDate = ts.toDate ? ts.toDate() : new Date(ts);
        return deliveryDate >= monthStart && deliveryDate <= monthEnd;
      })
      .sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        return aTime - bTime;
      });

    return { deliveries };
  } catch (error) {
    console.error("Грешка при четене на история:", error);
    return { deliveries: [] }; 
  }
}

export const getDriverDailyReport = async (driverId: string, date: Date) => {
  const db = getFirestore();
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const range = buildRange(start, end);

  const q = query(
    collection(db, 'deliveryHistory'),
    where('driverId', '==', driverId),
    where('timestamp', '>=', range.start),
    where('timestamp', '<', range.end)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getSystemStats = async () => {
  const db = getFirestore();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const range = buildRange(start, end);

  const q = query(
    collection(db, 'deliveryHistory'),
    where('timestamp', '>=', range.start),
    where('timestamp', '<', range.end)
  );

  const snapshot = await getDocs(q);
  return { totalDeliveriesLast30Days: snapshot.size };
};
