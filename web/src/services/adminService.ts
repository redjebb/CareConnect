import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  QueryDocumentSnapshot,
  updateDoc 
} from 'firebase/firestore';
import { db } from './firebase';
// Импортираме общия интерфейс от types.ts
import { Admin } from '../types';

const adminsCollection = collection(db, 'admins');

// Помощна функция за преобразуване на данните от Firestore
const mapAdminDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData>): Admin => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    status: (data.status === 'active' || data.status === 'pending') ? data.status : 'pending'
  };
};

export async function getAdmins(): Promise<Admin[]> {
  const snapshot = await getDocs(adminsCollection);
  return snapshot.docs.map(mapAdminDoc);
}

// Променена функция, която приема и статус
export async function addAdmin(admin: Omit<Admin, 'id'>): Promise<string> {
  const payload = {
    name: admin.name.trim(),
    email: admin.email.trim(),
    status: admin.status || 'pending'
  };

  const docRef = await addDoc(adminsCollection, payload);
  return docRef.id;
}

export async function deleteAdmin(id: string): Promise<void> {
  const adminDocRef = doc(db, 'admins', id);
  await deleteDoc(adminDocRef);
}