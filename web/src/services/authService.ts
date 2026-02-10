import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export type FirebaseUser = User;

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function createUserAccount(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
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
