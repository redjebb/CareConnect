import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { register } from '../services/authService'; // Използваме твоята функция за регистрация


export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('invalid');
        return;
      }

      try {
        // Търсим в Firestore документа, който ти току-що създаде ръчно
        const q = query(
          collection(db, 'invitations'), 
          where('token', '==', token), 
          where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setStatus('invalid');
        } else {
          const data = querySnapshot.docs[0].data();
          setEmail(data.email);
          setStatus('valid');
        }
      } catch (err) {
        console.error("Грешка при проверка на токена:", err);
        setStatus('invalid');
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      alert("Паролата трябва да е поне 6 символа.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Регистрираме потребителя в Firebase Auth
      await register(email, password);

      // 2. Маркираме поканата като използвана
      const q = query(collection(db, 'invitations'), where('token', '==', token));
      const querySnapshot = await getDocs(q);
      const invitationDocId = querySnapshot.docs[0].id;
      
      await updateDoc(doc(db, 'invitations', invitationDocId), {
        status: 'accepted',
        activatedAt: new Date()
      });

      alert("Акаунтът е активиран успешно!");
      navigate('/'); // Връщаме го в началото
    } catch (err: any) {
      alert("Грешка при активация: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') return <div className="p-10 text-center font-bold">Проверка на поканата...</div>;
  
  if (status === 'invalid') return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold text-red-600">Невалиден линк</h2>
        <p className="mt-2 text-gray-600">Линкът е изтекъл или вече е бил използван.</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Към входа</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <p className="text-blue-600 font-semibold uppercase text-xs tracking-widest">CareConnect</p>
        <h2 className="text-2xl font-bold text-slate-900 mt-2">Активиране на профил</h2>
        <p className="text-slate-500 mt-2">Добре дошли! Създайте парола за акаунт: <br/> 
          <span className="font-semibold text-slate-800">{email}</span>
        </p>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Нова парола</label>
            <input 
              type="password" 
              required
              min={6}
              className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Активиране...' : 'Завърши регистрацията'}
          </button>
        </form>
      </div>
    </div>
  );
}