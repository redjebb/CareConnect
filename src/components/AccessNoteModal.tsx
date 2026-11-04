import { useEffect, useState } from 'react';
import { MAX_NOTE_LENGTH } from '../config';
import { Client } from '../types';

interface AccessNoteModalProps {
  client: Client | null;
  isSaving: boolean;
  onSave: (note: string) => void;
  onClose: () => void;
}

// Lets the driver correct the persistent access instructions for a client,
// e.g. "3rd floor, door on the right". Saved for every future visit.
export default function AccessNoteModal({ client, isSaving, onSave, onClose }: AccessNoteModalProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(client?.notes ?? '');
  }, [client]);

  if (!client) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Бележка за ${client.name}`}
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-5 text-slate-100 shadow-2xl ring-1 ring-slate-700">
        <h3 className="text-base font-semibold">Бележка за достъп</h3>
        <p className="mt-1 text-xs text-slate-400">
          {client.name} · {client.address}
        </p>
        <textarea
          autoFocus
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={MAX_NOTE_LENGTH}
          rows={4}
          placeholder="напр. Качете се на 3-ти етаж, вратата е вдясно"
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
        />
        <p className="mt-1 text-right text-[10px] text-slate-500">
          {note.length}/{MAX_NOTE_LENGTH}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Отказ
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(note)}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {isSaving ? 'Записване...' : 'Запази'}
          </button>
        </div>
      </div>
    </div>
  );
}
