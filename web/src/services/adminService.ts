import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

export type Admin = {
  id: string;
  name: string;
  email: string;
};

type AdminPayload = {
  name: string;
  email: string;
};

const adminsCollection = collection(db, 'admins');

const mapAdminDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData>): Admin => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : ''
  };
};

export async function getAdmins(): Promise<Admin[]> {
  const snapshot = await getDocs(adminsCollection);
  return snapshot.docs.map(mapAdminDoc);
}

export async function addAdmin(admin: AdminPayload): Promise<string> {
  const payload: AdminPayload = {
    name: admin.name.trim(),
    email: admin.email.trim()
  };

  const docRef = await addDoc(adminsCollection, payload);
  return docRef.id;
}

export async function deleteAdmin(id: string): Promise<void> {
  const adminDocRef = doc(db, 'admins', id);
  await deleteDoc(adminDocRef);
}
