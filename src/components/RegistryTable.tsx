import { ClientRegistryEntry } from '../types';

interface RegistryTableProps {
  entries: ClientRegistryEntry[];
  isLoading: boolean;
  deletingId: string | null;
  onEdit: (entry: ClientRegistryEntry) => void;
  onDelete: (entryId: string) => void;
  onViewProfile: (entry: ClientRegistryEntry) => void;
}

export default function RegistryTable({
  entries,
  isLoading,
  deletingId,
  onEdit,
  onDelete,
  onViewProfile
}: RegistryTableProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Записи в регистъра</h2>
        {isLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
      </div>
      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading registry...</p>
      ) : entries.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Няма записи в регистъра.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-4 py-2 font-medium">ЕГН</th>
                <th className="px-4 py-2 font-medium">Име</th>
                <th className="px-4 py-2 font-medium">Телефон</th>
                <th className="px-4 py-2 font-medium">Адрес</th>
                <th className="px-4 py-2 font-medium">Меню / Порции</th>
                <th className="px-4 py-2 font-medium text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{entry.egn}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.name}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.address}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {entry.defaultMealCount}× {entry.defaultMealType}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onViewProfile(entry)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Профил
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        className="rounded-md border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Редактирай
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === entry.id ? 'Изтриване...' : 'Изтрий'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
