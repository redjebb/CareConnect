import type { FormEvent } from 'react';

type AdminsListItem = { id: string; name: string; email: string };

type AdminAdminsManagementViewProps = {
  admins: AdminsListItem[];
  adminsLoading: boolean;
  adminsError: string | null;

  adminSubmitting: boolean;
  adminDeletingId: string | null;

  adminForm: { name: string; email: string };
  onAdminInputChange: (field: 'name' | 'email', value: string) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteAdmin: (adminId: string) => void;
};

export default function AdminAdminsManagementView({
  admins,
  adminsLoading,
  adminsError,
  adminSubmitting,
  adminDeletingId,
  adminForm,
  onAdminInputChange,
  onSubmit,
  onDeleteAdmin
}: AdminAdminsManagementViewProps) {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold text-slate-900">Добави администратор</h2>
        <p className="mt-1 text-sm text-slate-500">Попълнете детайли за нов администратор.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Име</label>
            <input
              type="text"
              value={adminForm.name}
              onChange={event => onAdminInputChange('name', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Петър Петров"
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
              placeholder="admin@careconnect.bg"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={adminSubmitting}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
        >
          {adminSubmitting ? 'Добавяне...' : 'Запази администратор'}
        </button>

        {adminsError ? <p className="mt-3 text-sm text-red-600">{adminsError}</p> : null}
      </form>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Списък с администратори</h2>
          {adminsLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
        </div>

        {adminsLoading ? (
          <p className="mt-6 text-sm text-slate-500">Loading admins...</p>
        ) : admins.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Няма налични администратори.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-2 font-medium">Име</th>
                  <th className="px-4 py-2 font-medium">Имейл</th>
                  <th className="px-4 py-2 font-medium text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{admin.name}</td>
                    <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteAdmin(admin.id)}
                        disabled={adminDeletingId === admin.id}
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {adminDeletingId === admin.id ? 'Изтриване...' : 'Изтрий'}
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
