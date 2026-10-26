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
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export type FirebaseUser = User & { role?: string; driverId?: string };

// Bootstrap owner account. Mirrors isBootstrapMaster() in firestore.rules.
const BOOTSTRAP_MASTER_EMAIL = 'redjebtudjar@gmail.com';

export interface UserProfile {
  role: string;
  driverId?: string;
}

// Authorization data lives in users/{uid}; it can only be created by a master
// admin or by claiming an invitation (enforced in firestore.rules).
async function fetchProfile(user: User): Promise<UserProfile> {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const data = snap.data();
      return { role: typeof data.role === 'string' ? data.role : 'NO_ROLE', driverId: data.driverId || undefined };
    }
  } catch (error) {
    console.error('Грешка при зареждане на профил:', error);
  }
  if (user.email?.toLowerCase() === BOOTSTRAP_MASTER_EMAIL) {
    return { role: 'MASTER_ADMIN' };
  }
  return { role: 'NO_ROLE' };
}

export const login = async (email: string, pass: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;
  const profile = await fetchProfile(user);

  return {
    uid: user.uid,
    email: user.email,
    role: profile.role
  };
};

export async function getUserRole(uid: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() ? userDoc.data().role : null;
}

export class InvalidInvitationError extends Error {
  constructor() {
    super('invalid-invitation');
  }
}

export interface InvitationLink {
  email: string;
  token: string;
  role: 'DRIVER' | 'MANAGER';
  driverId?: string;
  adminId?: string;
}

// Registers the account (or signs in to an unfinished one) and claims the
// invitation with the secret token from the activation link. The invitation
// itself is unreadable for the invitee on purpose: firestore.rules validates
// the token we send, so a forged claim is refused server-side.
export async function activateInvitedAccount(invite: InvitationLink, password: string): Promise<void> {
  const email = invite.email.trim().toLowerCase();
  let user: User;
  let createdNow = false;

  try {
    user = (await createUserWithEmailAndPassword(auth, email, password)).user;
    createdNow = true;
  } catch (err: any) {
    if (err.code !== 'auth/email-already-in-use') throw err;
    user = (await signInWithEmailAndPassword(auth, email, password)).user;
  }

  try {
    const profileRef = doc(db, 'users', user.uid);
    if (!(await getDoc(profileRef)).exists()) {
      try {
        await setDoc(profileRef, {
          uid: user.uid,
          email,
          role: invite.role,
          driverId: invite.driverId ?? '',
          inviteToken: invite.token,
          createdAt: new Date().toISOString()
        });
      } catch (err: any) {
        if (err.code === 'permission-denied') throw new InvalidInvitationError();
        throw err;
      }
    }

    await updateDoc(doc(db, 'invitations', email), {
      status: 'accepted',
      activatedAt: new Date().toISOString()
    }).catch(() => undefined);

    const recordId = invite.role === 'DRIVER' ? invite.driverId : invite.adminId;
    if (recordId) {
      await updateDoc(doc(db, invite.role === 'DRIVER' ? 'drivers' : 'admins', recordId), {
        status: 'active',
        uid: user.uid
      });
    }
  } catch (err) {
    if (createdNow) {
      await deleteUser(user).catch(() => undefined);
    } else {
      await signOut(auth);
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    const profile = await fetchProfile(user);
    callback({ ...user, role: profile.role, driverId: profile.driverId });
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
