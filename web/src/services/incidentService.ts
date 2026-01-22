import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Incident } from '../types';

const incidentsCollection = collection(db, 'incidents');

export async function addIncident(incident: Omit<Incident, 'id' | 'status' | 'date'>): Promise<string> {
  const payload = {
    ...incident,
    date: new Date().toISOString(),
    status: 'Open'
  };
  const docRef = await addDoc(incidentsCollection, payload);
  return docRef.id;
}

export async function getOpenIncidents(): Promise<Incident[]> {
  const q = query(incidentsCollection, where('status', 'in', ['Open', 'Escalated']));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<Incident, 'id'>;
    return {
      id: docSnapshot.id,
      ...data
    };
  });
}
