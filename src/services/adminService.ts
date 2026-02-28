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
import { Admin } from '../types';

const adminsCollection = collection(db, 'admins');

const mapAdminDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData>): Admin => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    status: (data.status === 'active' || data.status === 'pending') ? data.status : 'pending',
    role: (data.role === 'MASTER_ADMIN' || data.role === 'MANAGER') ? data.role : 'MANAGER'
  };
};

export async function getAdmins(): Promise<Admin[]> {
  const snapshot = await getDocs(adminsCollection);
  return snapshot.docs.map(mapAdminDoc);
}

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