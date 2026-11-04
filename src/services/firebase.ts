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


import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { 
  connectFirestoreEmulator,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCMoafDDrJ93u4szxQ-NMbD-eytbwFttVw',
  authDomain: 'careconnect-d7bd7.firebaseapp.com',
  projectId: 'careconnect-d7bd7',
  storageBucket: 'careconnect-d7bd7.firebasestorage.app',
  messagingSenderId: '397488011762',
  appId: '1:397488011762:web:177d87e216bb0cb476d36b',
  measurementId: 'G-8MWBWJ8LFV'
};

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

// Emulators are seeded under the demo project id (see scripts/seed-demo.mjs).
const app = initializeApp(useEmulators ? { ...firebaseConfig, projectId: 'demo-careconnect' } : firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

// `npm run demo` runs the whole app against local Firebase emulators with
// seeded fake data, so nothing touches the production project.
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
