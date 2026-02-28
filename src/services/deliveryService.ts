import { addDoc, collection, getFirestore, Timestamp } from 'firebase/firestore';

export type GeoLocation = {
  lat: number;
  lng: number;
};

export type CompleteDeliveryPayload = {
  clientId: string;
  clientName: string;
  driverId: string;
  driverName: string;
  startLocation: GeoLocation;
  endLocation: GeoLocation;
  timestamp?: Date;
  mealType?: string;
  mealCount?: number;
  status?: 'success' | 'issue';
  issueType?: string;
  issueDescription?: string;
  driverSignature?: string;
  clientSignature?: string;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (start: GeoLocation, end: GeoLocation) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(end.lat - start.lat);
  const dLng = toRadians(end.lng - start.lng);
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const completeDelivery = async (payload: CompleteDeliveryPayload & { egn: string }) => {
  console.log('Sending to Firestore:', payload);
  
  const db = getFirestore();

  const docRef = await addDoc(collection(db, 'deliveryHistory'), {
    ...payload,
    timestamp: Timestamp.fromDate(payload.timestamp || new Date()),
    status: payload.status || 'success',
  });

  return { id: docRef.id };
};