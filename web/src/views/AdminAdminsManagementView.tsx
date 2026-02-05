import type { FormEvent } from 'react';

type AdminsListItem = { id: string; name: string; email: string };

type AdminAdminsManagementViewProps = {
  admins: AdminsListItem[];
  invitations: any[]; // Добавяме списъка с покани тук
  adminsLoading: boolean;
  adminsError: string | null;

  adminSubmitting: boolean;
  adminDeletingId: string | null;

  adminForm: { name: string; email: string };
  onAdminInputChange: (field: 'name' | 'email', value: string) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteAdmin: (adminId: string) => void;
};

// Помощен компонент за статуса (Badge)
const AdminStatusBadge = ({ email, invitations }: { email: string; invitations: any[] }) => {
  const invite = invitations.find(i => i.email === email);

  if (!invite || invite.status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Активен
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Чака активация
    </span>
  );
};

export default function AdminAdminsManagementView({
  admins,
  invitations, // Деструктурираме го тук
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
        <h2 className="text-xl font-semibold text-slate-900">Добави мениджър</h2>
        <p className="mt-1 text-sm text-slate-500">Попълнете детайли за нов мениджър на системата.</p>

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
              placeholder="manager@careconnect.bg"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={adminSubmitting}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-60"
        >
          {adminSubmitting ? 'Добавяне...' : 'Запази мениджър'}
        </button>

        {adminsError ? <p className="mt-3 text-sm text-red-600">{adminsError}</p> : null}
      </form>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Списък с мениджъри</h2>
          {adminsLoading ? <span className="text-sm text-slate-500">Зареждане...</span> : null}
        </div>

        {adminsLoading ? (
          <p className="mt-6 text-sm text-slate-500">Зареждане на данни...</p>
        ) : admins.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Няма налични мениджъри.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-4 py-2 font-medium">Име</th>
                  <th className="px-4 py-2 font-medium">Имейл</th>
                  <th className="px-4 py-2 font-medium">Статус</th> {/* Нова колона */}
                  <th className="px-4 py-2 font-medium text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{admin.name}</td>
                    <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge email={admin.email} invitations={invitations} />
                    </td>
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