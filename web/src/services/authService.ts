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
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth, db } from './firebase'; 
import { doc, getDoc } from 'firebase/firestore';

export type FirebaseUser = User & { role?: string };

export async function login(email: string, password: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  
  if (!userDoc.exists()) {
    throw new Error('user-not-found-in-db');
  }

  const userData = userDoc.data();
  return { ...user, role: userData.role };
}

export async function getUserRole(uid: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? userDoc.data().role : null;
}

export async function createUserAccount(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const role = await getUserRole(user.uid);
        callback({ 
          ...user, 
          role: role || 'NO_ROLE' 
        });
      } catch (error) {
        console.error("Грешка при взимане на роля в абонамента:", error);
        callback({ ...user, role: undefined });
      }
    } else {
      callback(null);
    }
  });
}

export const getFriendlyErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Невалиден формат на имейл адреса.';
    case 'auth/user-disabled':
      return 'Този акаунт е деактивиран.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Грешен имейл или парола.';
    case 'auth/email-already-in-use':
      return 'Този имейл вече е регистриран.';
    case 'auth/weak-password':
      return 'Паролата трябва да бъде поне 6 символа.';
    case 'auth/network-request-failed':
      return 'Проблем с интернет връзката. Моля, проверете мрежата си.';
    case 'auth/too-many-requests':
      return 'Твърде много неуспешни опити. Моля, опитайте по-късно.';
      case 'permission-denied':
      return 'Нямате необходимите права за тази операция.';
    case 'unavailable':
      return 'Услугата е временно недостъпна. Проверете връзката си.';
    case 'not-found':
      return 'Търсеният запис не беше намерен.';
    case 'already-exists':
      return 'Този запис вече съществува.';
    case 'deadline-exceeded':
      return 'Времето за заявката изтече. Опитайте отново.';
      case 'storage/unauthorized':
      return 'Нямате разрешение за качване на файлове.';
    case 'storage/quota-exceeded':
      return 'Лимитът на хранилището е запълнен.';
    case 'resource-exhausted':
     return 'Твърде много заявки към сървъра. Моля, изчакайте малко.';
    case 'cancelled':
     return 'Операцията беше прекъсната.';
    default:
      return 'Възникна неочаквана грешка. Моля, опитайте отново.';
  }
};
