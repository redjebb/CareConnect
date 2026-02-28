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

export async function getGlobalMonthlyReport(date: Date) {
  const db = getFirestore();
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  try {
    // Fetch all drivers for name/area lookups
    const driversSnap = await getDocs(collection(db, 'drivers'));
    const driversData: Record<string, any> = {};
    driversSnap.forEach(doc => {
      driversData[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Aggregate shift durations per driver within the selected month
    const shiftsSnap = await getDocs(collection(db, 'shifts'));
    const driverShifts: Record<string, number> = {};
    
    shiftsSnap.forEach(doc => {
      const shift = doc.data();
      const sTime = shift.startTime?.toDate ? shift.startTime.toDate() : new Date(shift.startTime);
      
      if (sTime >= monthStart && sTime <= monthEnd && shift.driverId && shift.endTime) {
        const eTime = shift.endTime?.toDate ? shift.endTime.toDate() : new Date(shift.endTime);
        const diffMinutes = (eTime.getTime() - sTime.getTime()) / (1000 * 60);
        
        if (!driverShifts[shift.driverId]) driverShifts[shift.driverId] = 0;
        driverShifts[shift.driverId] += diffMinutes;
      }
    });

    // Filter delivery history to the selected month
    const historySnap = await getDocs(collection(db, 'deliveryHistory'));
    const allDeliveries = historySnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(d => {
        const ts = d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        return ts >= monthStart && ts <= monthEnd;
      });

    const driverMap: Record<string, any> = {};

    // Initialize stats map with all drivers so none are omitted
    Object.keys(driversData).forEach(dId => {
      const info = driversData[dId];
      driverMap[dId] = {
        driverName: info.name || 'Шофьор',
        routeArea: info.routeArea || 'Неизвестен',
        deliveriesCount: 0,
        issuesCount: 0,
        rawMinutes: driverShifts[dId] || 0
      };
    });

    allDeliveries.forEach(d => {
      const dId = d.driverId;
      if (dId && driverMap[dId]) {
        if (d.status === 'success' || d.completed === true) {
          driverMap[dId].deliveriesCount++;
        } else if (d.status === 'issue' || d.hasIssue === true) {
          driverMap[dId].issuesCount++;
        }
      }
    });

    const driverStats = Object.values(driverMap).map(driver => {
      const hours = Math.floor(driver.rawMinutes / 60);
      const mins = Math.round(driver.rawMinutes % 60);
      return {
        ...driver,
        totalTime: driver.rawMinutes > 0 ? `${hours}ч. ${mins}м.` : '0ч. 0м.'
      };
    });

    const uniqueClientsCount = new Set(allDeliveries.map(d => d.egn)).size;

    return {
      stats: {
        totalDeliveries: allDeliveries.filter(d => d.status === 'success' || d.completed).length,
        uniqueClients: uniqueClientsCount,
        totalIssues: allDeliveries.filter(d => d.status === 'issue' || d.hasIssue).length,
        period: date.toLocaleDateString('bg-BG', { month: 'long', year: 'numeric' })
      },
      driverStats: driverStats.filter(ds => ds.deliveriesCount > 0 || ds.rawMinutes > 0)
    };
  } catch (error) {
    console.error("Грешка при генериране на общ отчет:", error);
    throw error;
  }
}