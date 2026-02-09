import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// 1. ЗАПОЧВАНЕ НА СМЯНА
export const startShift = async (driverId: string) => {
  try {
    const shiftData = {
      driverId: driverId,
      startTime: serverTimestamp(),
      endTime: null,
      status: 'active'
    };
    
    const docRef = await addDoc(collection(db, 'shifts'), shiftData);
    console.log("✅ Смяната е стартирана с ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Грешка при стартиране на смяна:", error);
    throw error;
  }
};

// 2. ПРИКЛЮЧВАНЕ НА СМЯНА
export const endShift = async (driverId: string) => {
  try {
    // Търсим последната активна смяна на този шофьор
    const q = query(
      collection(db, 'shifts'),
      where('driverId', '==', driverId),
      where('status', '==', 'active'),
      orderBy('startTime', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn("⚠️ Няма активна смяна за затваряне.");
      return;
    }

    const shiftDoc = querySnapshot.docs[0];
    const shiftRef = doc(db, 'shifts', shiftDoc.id);

    await updateDoc(shiftRef, {
      endTime: serverTimestamp(),
      status: 'completed'
    });
    
    console.log("✅ Смяната е приключена успешно.");
  } catch (error) {
    console.error("❌ Грешка при приключване на смяна:", error);
    throw error;
  }
};