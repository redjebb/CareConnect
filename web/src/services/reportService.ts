import { collection, getDocs, getFirestore, query, Timestamp, where } from 'firebase/firestore';

const buildRange = (start: Date, end: Date) => ({
  start: Timestamp.fromDate(start),
  end: Timestamp.fromDate(end),
});

export const getClientMonthlyReport = async (clientId: string, month: Date) => {
  const db = getFirestore();
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const range = buildRange(start, end);

  const q = query(
    collection(db, 'deliveryHistory'),
    where('clientId', '==', clientId),
    where('timestamp', '>=', range.start),
    where('timestamp', '<', range.end)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

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
