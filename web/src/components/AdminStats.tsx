    type AdminStatsProps = {
    totalClients: number;
    totalPortions: number;
    remainingDeliveries: number;
    activeSosCount: number;
    };

    export default function AdminStats({
    totalClients,
    totalPortions,
    remainingDeliveries,
    activeSosCount
    }: AdminStatsProps) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-slate-600">Общо клиенти</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{totalClients}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11a4 4 0 100-8 4 4 0 000 8z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
                </svg>
            </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">За днес (по график)</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-slate-600">Общо порции храна</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{totalPortions}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v20" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 11h2a3 3 0 003-3V2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 2v6a3 3 0 003 3h2V2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 2v20" />
                </svg>
            </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Сума от порциите за днес</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-slate-600">Остават за доставка</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{remainingDeliveries}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h13v10H3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 10h4l1 2v5h-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17a2 2 0 104 0" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17a2 2 0 104 0" />
                </svg>
            </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Без отчет или подпис</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-slate-600">Активни SOS сигнали</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{activeSosCount}</p>
            </div>
            <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
                activeSosCount > 0
                    ? 'bg-red-50 text-red-600 ring-red-100 animate-pulse'
                    : 'bg-red-50 text-red-600 ring-red-100'
                }`}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
            </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Ескалирани / SOS (незатворени)</p>
        </div>
        </div>
    );
    }
