import {
  Timestamp,
  collection,
  getDocs,
  getFirestore,
  orderBy,
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
 * If `end` is provided, treat `monthOrStart` as the explicit start range.
 */
export async function getClientMonthlyReport(clientId: string, monthOrStart: Date, end?: Date) {
  const db = getFirestore();

  const start = end ? monthOrStart : startOfMonth(monthOrStart);
  const finish = end ? end : endOfMonth(monthOrStart);

  console.log('Querying range:', start, finish);

  const q = query(
    collection(db, 'deliveryHistory'),
    where('clientId', '==', clientId),
    where('timestamp', '>=', Timestamp.fromDate(start)),
    where('timestamp', '<=', Timestamp.fromDate(finish)),
    orderBy('timestamp', 'asc')
  );

  const snap = await getDocs(q);

  const deliveries = snap.docs.map(doc => {
    const data = doc.data() as any;
    const ts: Timestamp | undefined = data?.timestamp;

    return {
      id: doc.id,
      timestamp: ts,
      deliveredAt: ts?.toDate?.() ? ts.toDate().toISOString() : undefined,
      // keep any extra fields if needed by other callers:
      driverId: data?.driverId,
      status: data?.status,
      distanceTravelled: data?.distanceTravelled
    };
  });

  return { deliveries, start, end: finish };
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
