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
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export type FirebaseUser = User & { role?: string };

async function fetchRoleByEmail(email: string): Promise<string> {
  try {
    const adminsRef = collection(db, 'admins');
    const q = query(adminsRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const adminData = querySnapshot.docs[0].data();
      console.log("Намерен админ:", adminData);
      return adminData.role || 'MANAGER'; 
    }

    const driversRef = collection(db, 'drivers');
    const dq = query(driversRef, where("email", "==", email));
    const driverSnapshot = await getDocs(dq);

    if (!driverSnapshot.empty) return 'DRIVER';

    return 'NO_ROLE';
  } catch (error) {
    console.error("Грешка при fetchRole:", error);
    return 'NO_ROLE';
  }
}

export const login = async (email: string, pass: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  // Взимаме ролята директно от базата при логин
  const role = await fetchRoleByEmail(user.email!);

  return {
    uid: user.uid,
    email: user.email,
    role: role
  };
};

export async function getUserRole(uid: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? userDoc.data().role : null;
}

export async function createUserAccount(email: string, password: string): Promise<any> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  await ensureUserDocumentExists(user);
  
  return userCredential; 
}

export const ensureUserDocumentExists = async (user: any) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  // 1. Ако вече има документ, връщаме ролята
  if (userSnap.exists()) {
    return userSnap.data().role;
  }

  // 2. Намираме реалната роля (Търсим в admins, после в drivers)
  let roleToAssign = 'USER'; 

  // Проверка за Мениджър
  const adminsRef = collection(db, 'admins');
  const adminQ = query(adminsRef, where("email", "==", user.email));
  const adminSnap = await getDocs(adminQ);
  
  if (!adminSnap.empty) {
    roleToAssign = 'MANAGER';
  } else {
    // Проверка за Шофьор
    const driversRef = collection(db, 'drivers');
    const driverQ = query(driversRef, where("email", "==", user.email));
    const driverSnap = await getDocs(driverQ);
    if (!driverSnap.empty) {
      roleToAssign = 'DRIVER';
    }
  }

  // 3. Записваме новия потребител в 'users' 
  await setDoc(userRef, {
    email: user.email,
    role: roleToAssign,
    uid: user.uid,
    createdAt: new Date().toISOString()
  });

  return roleToAssign;
};

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const role = await fetchRoleByEmail(user.email!);
        callback({ 
          ...user, 
          role: role 
        });
      } catch (error) {
        console.error("Грешка при взимане на роля:", error);
        callback({ ...user, role: 'NO_ROLE' });
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
