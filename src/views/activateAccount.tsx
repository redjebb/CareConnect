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


import React, { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { activateInvitedAccount, getFriendlyErrorMessage, InvalidInvitationError, InvitationLink } from '../services/authService';
import { useNotification } from '../components/NotificationProvider';

const MIN_PASSWORD_LENGTH = 8;

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Everything needed to claim the invitation travels in the e-mailed link.
  const invite = useMemo<InvitationLink | null>(() => {
    const email = searchParams.get('email')?.trim();
    const token = searchParams.get('token');
    const role = searchParams.get('role') === 'driver' ? 'DRIVER' : 'MANAGER';
    if (!email || !token) return null;
    return {
      email,
      token,
      role,
      driverId: searchParams.get('driver') ?? undefined,
      adminId: searchParams.get('admin') ?? undefined
    };
  }, [searchParams]);

  const status: 'valid' | 'invalid' = invite ? 'valid' : 'invalid';
  const email = invite?.email ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Паролата трябва да е поне ${MIN_PASSWORD_LENGTH} символа.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Паролите не съвпадат!');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await activateInvitedAccount(invite, password);
      showNotification('Акаунтът е активиран успешно!', 'success');
      navigate('/');
    } catch (err: any) {
      if (err instanceof InvalidInvitationError) {
        setErrorMessage('Поканата е невалидна, изтекла или вече използвана.');
      } else {
        setErrorMessage(getFriendlyErrorMessage(err.code || ''));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
              placeholder="Минимум 8 символа"
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