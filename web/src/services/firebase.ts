import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCMoafDDrJ93u4szxQ-NMbD-eytbwFttVw',
  authDomain: 'careconnect-d7bd7.firebaseapp.com',
  projectId: 'careconnect-d7bd7',
  storageBucket: 'careconnect-d7bd7.firebasestorage.app',
  messagingSenderId: '397488011762',
  appId: '1:397488011762:web:177d87e216bb0cb476d36b',
  measurementId: 'G-8MWBWJ8LFV'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
