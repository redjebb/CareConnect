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


import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase'; 
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { createUserAccount, getFriendlyErrorMessage } from '../services/authService';

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailParam = searchParams.get('email');

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!emailParam) {
        setStatus('invalid');
        return;
      }

      try {
        const q = query(
          collection(db, 'invitations'), 
          where('email', '==', emailParam.trim())
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setStatus('invalid');
        } else {
          const invData = querySnapshot.docs[0].data();
          if (invData.status === 'accepted') {
            setStatus('invalid');
          } else {
            setEmail(emailParam.trim());
            setStatus('valid');
          }
        }
      } catch (err) {
        console.error("Грешка при проверка на поканата:", err);
        setStatus('invalid');
      }
    };

    verifyInvitation();
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("Паролата трябва да е поне 6 символа.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Паролите не съвпадат.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Регистрираме потребителя в Firebase Authentication
      await createUserAccount(email, password);

      // 2. Маркираме поканата като 'accepted' в колекция 'invitations'
      const invQ = query(collection(db, 'invitations'), where('email', '==', email));
      const invSnapshot = await getDocs(invQ);
      if (!invSnapshot.empty) {
        await updateDoc(doc(db, 'invitations', invSnapshot.docs[0].id), {
          status: 'accepted',
          activatedAt: new Date().toISOString()
        });
      }

      // 3. Обновяваме статуса на 'active' в съответната роля (drivers ИЛИ admins)
      // Проверяваме и двете колекции, защото потребителят може да е или едното, или другото
      const roles = ['drivers', 'admins'];
      
      for (const role of roles) {
        const roleQ = query(collection(db, role), where('email', '==', email));
        const roleSnapshot = await getDocs(roleQ);
        
        if (!roleSnapshot.empty) {
          await updateDoc(doc(db, role, roleSnapshot.docs[0].id), {
            status: 'active'
          });
        }
      }

      alert("Акаунтът е активиран успешно! Вече можете да влезете в системата.");
      navigate('/'); 
    } catch (err: any) {
  console.error("Грешка при активация:", err);
  const friendlyMessage = getFriendlyErrorMessage(err.code);
  setErrorMessage(friendlyMessage);
} finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl font-semibold text-slate-600 animate-pulse">Проверка на поканата...</div>
      </div>
    );
  }
  
  if (status === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900">Невалиден линк</h2>
          <p className="mt-2 text-gray-500">Този линк е невалиден, изтекъл или акаунтът вече е бил активиран.</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Към страницата за вход
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="mb-8">
          <p className="text-blue-600 font-bold uppercase text-xs tracking-widest">CareConnect</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Активация</h2>
          <p className="text-slate-500 mt-2">
            Създайте парола за Вашия акаунт:<br/> 
            <span className="font-bold text-slate-800">{email}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Нова парола</label>
            <input 
              type="password" 
              required
              className="mt-1 w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символа"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Потвърди парола</label>
            <input 
              type="password" 
              required
              className="mt-1 w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторете паролата"
            />
          </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Активиране...' : 'Завърши регистрацията'}
          </button>
        </form>
      </div>
    </div>
  );
}