import { FormEvent, useState } from 'react';
import { Client } from './types';

interface IncidentReporterProps {
  client: Client;
  onClose: () => void;
  onSubmitReport: (type: string, description: string) => Promise<void> | void;
}

const INCIDENT_OPTIONS = [
  'Не отвори',
  'Отказ от храна',
  'Адресът е грешен',
  'Клиент е в лошо състояние',
  'Викай лекар - близък'
] as const;

export default function IncidentReporter({ client, onClose, onSubmitReport }: IncidentReporterProps) {
  const [incidentType, setIncidentType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!incidentType) {
      setError('Моля, изберете тип на инцидента.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitReport(incidentType, description);
      onClose();
    } catch (submitError) {
      console.error('Неуспешно записване на инцидент:', submitError);
      setError('Неуспешно записване на инцидент. Моля, опитайте отново.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Инцидент за клиент</p>
            <h2 className="text-lg font-semibold text-slate-900">{client.name}</h2>
            <p className="text-sm text-slate-500">{client.address}</p>
            {showPhone ? (
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Телефон: <span className="font-normal text-slate-700">{client.phone || 'Няма номер'}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            disabled={isSubmitting}
          >
            Затвори
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700">Тип на инцидента*</label>
            <select
              value={incidentType}
              onChange={event => setIncidentType(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              required
            >
              <option value="">Изберете тип</option>
              {INCIDENT_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Описание (по избор)</label>
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="Опишете какво се случи..."
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowPhone(prev => !prev)}
              className="w-full rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-400 disabled:opacity-60"
              disabled={isSubmitting}
            >
              Покажи тел.номер на клиент
            </button>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Изпращане...' : 'Изпрати до администратор'}
          </button>
        </form>
      </div>
    </div>
  );
}
