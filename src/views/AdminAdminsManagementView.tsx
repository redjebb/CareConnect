import { useState } from 'react';
import type { FormEvent } from 'react';
import { UserPlus, Search, Mail, ShieldCheck, Trash2, UserCircle, CheckCircle2, Clock, Shield } from 'lucide-react';

type AdminsListItem = { id: string; name: string; email: string; role?: string; status?: string };

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

const AdminStatusBadge = ({ admin, invitations }: { admin: any; invitations: any[] }) => {
  const invite = invitations.find(i => i.email === admin.email);

  const isActive = admin.status === 'active' || (invite && invite.status === 'accepted');

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Активен
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 ring-1 ring-amber-200">
      <Clock className="h-3 w-3" /> Чака активация
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

  const filteredAdmins = admins
    .filter(admin =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));

  const inputClasses = "mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400";
  const labelClasses = "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1";

  return (
    <section className="grid gap-8 lg:grid-cols-[400px_1fr] items-start">
      {/* ФОРМА ЗА ДОБАВЯНЕ */}
      <aside className="lg:sticky lg:top-24">
        <form onSubmit={onSubmit} className="overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/60">
          <div className="bg-slate-50 p-6 border-b border-slate-100">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Добави мениджър
            </h2>
            <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-tight">Административен достъп</p>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className={labelClasses}><UserCircle className="w-3 h-3" /> Пълно име</label>
              <input
                type="text"
                value={adminForm.name}
                onChange={event => onAdminInputChange('name', event.target.value)}
                className={inputClasses}
                placeholder="Име и фамилия"
                required
              />
            </div>

            <div>
              <label className={labelClasses}><Mail className="w-3 h-3" /> Имейл адрес</label>
              <input
                type="email"
                value={adminForm.email}
                onChange={event => onAdminInputChange('email', event.target.value)}
                className={inputClasses}
                placeholder="manager@careconnect.bg"
                required
              />
            </div>

            <button
              type="submit"
              disabled={adminSubmitting}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              {adminSubmitting ? 'Записване...' : 'Запази мениджър'}
            </button>
            
            {adminsError && (
              <p className="mt-2 text-center text-xs font-bold text-red-500 bg-red-50 py-2 rounded-xl border border-red-100">
                {adminsError}
              </p>
            )}
          </div>
        </form>
      </aside>

      {/* СПИСЪК С МЕНИДЖЪРИ */}
      <main className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              Екип <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-2xl text-sm">{filteredAdmins.length}</span>
            </h2>
            <p className="text-sm font-medium text-slate-500">Мениджъри с право на управление</p>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Търси мениджър..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
            />
          </div>
        </div>

        {adminsLoading ? (
          <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase text-xs tracking-widest">
            Зареждане на списъка...
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="rounded-[2.5rem] bg-slate-100/50 p-20 text-center border-2 border-dashed border-slate-200">
            <Shield className="mx-auto h-10 w-10 text-slate-300 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Няма добавени мениджъри</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
            {filteredAdmins.map(admin => (
              <div key={admin.id} className="group relative rounded-[2rem] bg-white p-6 border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl font-black text-blue-200 group-hover:text-blue-600 transition-colors">
                      <ShieldCheck className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight">{admin.name}</h4>
                      <div className="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Mail className="h-3.5 w-3.5" /> {admin.email}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (window.confirm(`Сигурни ли сте, че искате да премахнете мениджър ${admin.name}?`)) {
                        onDeleteAdmin(admin.id);
                      }
                    }}
                    disabled={adminDeletingId === admin.id}
                    className="p-2.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-5">
                  <div className="flex flex-col gap-0.5">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ниво на достъп</span>
               <p className="text-xs font-bold text-slate-700">
                {admin.role === 'MASTER_ADMIN' ? 'Системен администратор' : 'Оперативен мениджър'}
  </p>
</div>
                  
                  <AdminStatusBadge admin={admin} invitations={invitations} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </section>
  );
}