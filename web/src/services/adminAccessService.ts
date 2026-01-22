import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export async function checkStandardAdminStatus(email: string): Promise<boolean> {
  if (!email) {
    return false;
  }

  try {
    console.log('[Auth] Checking standard admin status for', email);
    const adminsRef = collection(db, 'admins');
    const adminQuery = query(adminsRef, where('email', '==', email));
    const snapshot = await getDocs(adminQuery);
    const hasAccess = !snapshot.empty;
    console.log('[Auth] Standard admin query result', {
      email,
      docCount: snapshot.docs.length,
      hasAccess
    });
    return hasAccess;
  } catch (err) {
    console.error('Неуспешна проверка на стандартен администратор.', err);
    return false;
  }
}
