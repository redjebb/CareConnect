import { useState } from 'react';
import type { FormEvent } from 'react';

type AdminsListItem = { id: string; name: string; email: string };

type AdminAdminsManagementViewProps = {
  admins: AdminsListItem[];
  invitations: any[]; 
  adminsLoading: boolean;
  adminsError: string | null;

  adminSubmitting: boolean;
  adminDeletingId: string | null;

  adminForm: { name: string; email: string };
  onAdminInputChange: (field: 'name' | 'email', value: string) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteAdmin: (adminId: string) => void;
};

// Компонент за статус на мениджъра
const AdminStatusBadge = ({ email, invitations }: { email: string; invitations: any[] }) => {
  const invite = invitations.find(i => i.email === email);

  if (!invite || invite.status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Активен
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Чака активация
    </span>
  );
};

export default function AdminAdminsManagementView({
  admins,
  invitations,
  adminsLoading,
  adminsError,
  adminSubmitting,
  adminDeletingId,
  adminForm,
  onAdminInputChange,
  onSubmit,
  onDeleteAdmin
}: AdminAdminsManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Филтриране и сортиране на списъка (Кирилица)
  const filteredAdmins = admins
    .filter(admin =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {/* ФОРМА ЗА ДОБАВЯНЕ */}
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow h-fit">
        <h2 className="text-xl font-semibold text-slate-900">Добави мениджър</h2>
        <p className="mt-1 text-sm text-slate-500">Попълнете детайли за нов мениджър с достъп до панела.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Име</label>
            <input
              type="text"
              value={adminForm.name}
              onChange={event => onAdminInputChange('name', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Име и фамилия"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Имейл</label>
            <input
              type="email"
              value={adminForm.email}
              onChange={event => onAdminInputChange('email', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="manager@careconnect.bg"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={adminSubmitting}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {adminSubmitting ? 'Записване...' : 'Запази мениджър'}
        </button>

        {adminsError ? <p className="mt-3 text-sm text-red-600 font-medium">{adminsError}</p> : null}
      </form>

      {/* СПИСЪК С МЕНИДЖЪРИ */}
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-50 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Списък с мениджъри</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600">
              {filteredAdmins.length}
            </span>
          </div>
          <input 
            type="text"
            placeholder="Търси мениджър..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-48 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {adminsLoading ? (
          <p className="mt-6 text-sm text-slate-500 italic text-center">Зареждане на списъка...</p>
        ) : filteredAdmins.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500 italic">
              {searchTerm ? 'Няма намерени мениджъри.' : 'Няма добавени мениджъри.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3 font-bold italic">Име</th>
                  <th className="px-4 py-3 font-bold italic">Имейл</th>
                  <th className="px-4 py-3 font-bold italic">Статус</th>
                  <th className="px-4 py-3 font-bold italic text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.map(admin => (
                  <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{admin.name}</td>
                    <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge email={admin.email} invitations={invitations} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Сигурни ли сте, че искате да премахнете мениджър ${admin.name}?`)) {
                            onDeleteAdmin(admin.id);
                          }
                        }}
                        disabled={adminDeletingId === admin.id}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-60"
                      >
                        {adminDeletingId === admin.id ? '...' : 'Изтрий'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}