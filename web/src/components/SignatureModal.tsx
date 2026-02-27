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


import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Client } from '../types';
import { useNotification } from '../components/NotificationProvider';

interface SignatureModalProps {
  isOpen: boolean;
  client: Client | null;
  onCancel: () => void;
  onComplete: (driverSignature: string, clientSignature: string) => Promise<void> | void;
}

export default function SignatureModal({ isOpen, client, onCancel, onComplete }: SignatureModalProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [signatureStep, setSignatureStep] = useState<1 | 2>(1);
  const [driverSignature, setDriverSignature] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      setSignatureStep(1);
      setDriverSignature(null);
      setSignatureError(null);
      queueMicrotask(() => {
        sigCanvasRef.current?.clear();
      });
    }
  }, [isOpen]);

  if (!isOpen || !client) {
    return null;
  }

  const handleConfirm = async () => {
    if (!sigCanvasRef.current) {
      showNotification('Моля, положете подпис!', 'warning');
      return;
    }

    const canvas = sigCanvasRef.current;
    const isEmpty = typeof canvas.isEmpty === 'function' ? canvas.isEmpty() : true;
    if (isEmpty) {
      showNotification('Моля, положете подпис!', 'warning');
      return;
    }

    const dataUrl = canvas.getCanvas().toDataURL('image/png');

    if (signatureStep === 1) {
      setDriverSignature(dataUrl);
      canvas.clear();
      setSignatureStep(2);
      return;
    }

    if (!driverSignature) {
      showNotification('Липсва подпис на шофьора. Моля, подпишете първо като шофьор.', 'error');
      setSignatureStep(1);
      canvas.clear();
      return;
    }

    const clientSig = dataUrl;
    canvas.clear();
    await onComplete(driverSignature, clientSig);
    onCancel();
    setSignatureStep(1);
    setSignatureError(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">
          {signatureStep === 1 ? 'Подпис на ШОФЬОР' : 'Подпис на КЛИЕНТ'}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {signatureStep === 1
            ? 'Моля, шофьорът да се подпише.'
            : 'Моля, клиентът да се подпише за получаване.'}
        </p>
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-2">
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="#0f172a"
            canvasProps={{ className: 'w-full h-48 bg-white rounded-md' }}
          />
        </div>
        {signatureError ? <p className="mt-2 text-xs text-red-600">{signatureError}</p> : null}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              sigCanvasRef.current?.clear();
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Изчисти
          </button>
          <div className="flex gap-2">
            {signatureStep === 2 ? (
              <button
                type="button"
                onClick={() => {
                  setSignatureStep(1);
                  setDriverSignature(null);
                  setSignatureError(null);
                  queueMicrotask(() => sigCanvasRef.current?.clear());
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Назад
              </button>
            ) : null}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Отказ
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Потвърди
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}