import { useAdminData } from '../hooks/useAdminData';
import AdminDailyListView from './AdminDailyListView';
import AdminDriversView from './AdminDriversView';
import AdminAdminsManagementView from './AdminAdminsManagementView';
import AdminRegistryView from './AdminRegistryView';
import UserProfileModal from '../components/UserProfileModal';

const CITY_DATA: Record<string, string[]> = {
  София: [
    'Средец',
    'Красно село',
    'Възраждане',
    'Оборище',
    'Сердика',
    'Подуяне',
    'Слатина',
    'Изгрев',
    'Лозенец',
    'Триадица',
    'Красна поляна',
    'Илинден',
    'Надежда',
    'Искър',
    'Младост',
    'Студентски',
    'Витоша',
    'Овча купел',
    'Люлин',
    'Връбница',
    'Нови Искър',
    'Кремиковци',
    'Панчарево',
    'Банкя'
  ],
  Пловдив: ['Централен', 'Тракия', 'Южен', 'Северен', 'Западен', 'Източен'],
  Варна: ['Одесос', 'Приморски', 'Младост', 'Вл. Варненчик', 'Аспарухово']
};

const formatNextVisitDate = (value?: string | null) => {
  if (!value) {
    return 'Няма насрочено';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Няма насрочено';
  }
  return date.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const renderLastCheckInStatus = (lastCheckIn: string | undefined) => {
  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('bg-BG', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!lastCheckIn) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-500">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Няма отчет за посещение
      </span>
    );
  }

  const normalized = lastCheckIn.trim();
  const normalizedUpper = normalized.toUpperCase();

  const renderIncidentStatus = (payload: string) => {
    const trimmed = payload.trim();
    const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
    const timestamp = isoMatch ? isoMatch[0] : '';
    const incidentType = isoMatch ? trimmed.replace(timestamp, '').trim() : trimmed;
    const formattedDate = timestamp ? formatDate(timestamp) : 'неизвестно време';

    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Сигнал: {incidentType || 'Непознат тип'} ({formattedDate})
      </span>
    );
  };

  if (normalizedUpper.startsWith('INCIDENT:')) {
    const payload = normalized.slice(normalizedUpper.indexOf('INCIDENT:') + 'INCIDENT:'.length);
    return renderIncidentStatus(payload);
  }

  const isLegacySos = normalizedUpper.startsWith('SOS ');
  const printableValue = isLegacySos ? normalized.replace(/^SOS\s+/i, '') : normalized;
  const formatted = formatDate(printableValue);

  if (isLegacySos) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Сигнал: SOS ({formatted})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-500">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      Последен отчет: {formatted}
    </span>
  );
};

interface AdminDashboardProps {
  userEmail: string;
  isMasterAdmin: boolean;
  onLogout: () => Promise<void> | void;
}

export default function AdminDashboard({ userEmail, isMasterAdmin, onLogout }: AdminDashboardProps) {
  const adminData = useAdminData(isMasterAdmin);

  const {
    // nav
    currentView,
    setCurrentView,
    clientManagementTab,
    setClientManagementTab,

    // shared for daily/registry views
    profileSearch,
    setProfileSearch,
    isProfileSearchOpen,
    setIsProfileSearchOpen,
    profileSearchResults,
    handleSelectProfileSearch,

    // profile modal
    isProfileModalOpen,
    profileEntry,
    profileHistory,
    profileLoading,
    profileError,
    handleCloseProfile,

    // stats (daily)
    totalClientsToday,
    totalPortionsToday,
    remainingDeliveriesToday,
    activeSosCount,

    // daily
    scheduleItems,
    clients,
    drivers,
    selectedDate,
    handleDateChange,
    registrySearch,
    selectedRegistryEntryId,
    registrySuggestions,
    setRegistrySearch,
    setSelectedRegistryEntryId,
    applyRegistrySelection,
    clientForm,
    setClientForm,
    handleClientInputChange,
    driversLoading,
    clientSubmitting,
    clientsError,
    handleAddClient,
    handleAddClientForSelectedDate,
    clientsLoading,
    clientDeletingId,
    reportGenerating,
    handleGenerateMonthlyReport,
    handleDeleteClient,
    handleOpenSignaturePreview,

    // registry
    registryForm,
    registryEditingId,
    registrySubmitting,
    registryError,
    sortedRegistryEntries,
    registryLoading,
    registryDeletingId,
    registryAddressSuggestions,
    showRegistryAddressSuggestions,
    setShowRegistryAddressSuggestions,
    handleSelectRegistryAddressSuggestion,
    handleRegistryInputChange,
    handleSubmitRegistryEntry,
    resetRegistryForm,
    handleEditRegistryEntry,
    handleRemoveRegistryEntry,
    handleOpenProfile,

    // drivers
    driversError,
    driverSubmitting,
    driverDeletingId,
    driverForm,
    handleDriverInputChange,
    handleDriverCityChange,
    handleAddDriver,
    handleDeleteDriver,

    // admins
    admins,
    adminsLoading,
    adminsError,
    adminSubmitting,
    adminDeletingId,
    adminForm,
    handleAdminInputChange,
    handleAddAdmin,
    handleDeleteAdmin
  } = adminData;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">CareConnect</p>
              <h1 className="text-2xl font-bold text-slate-900">
                Добре дошъл, <span className="text-blue-600">{userEmail}</span>!
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Изход
            </button>
          </div>

          <nav className="mt-4 flex flex-col gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
              {isMasterAdmin && (
                <button
                  type="button"
                  onClick={() => setCurrentView('admins')}
                  className={`rounded-lg px-4 py-2 transition ${
                    currentView === 'admins'
                      ? 'bg-white text-slate-900 shadow'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Управление на Администратори
                </button>
              )}

              <button
                type="button"
                onClick={() => setCurrentView('clients')}
                className={`ml-1 rounded-lg px-4 py-2 transition ${
                  currentView === 'clients'
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Управление на Клиенти
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('drivers')}
                className={`ml-1 rounded-lg px-4 py-2 transition ${
                  currentView === 'drivers'
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Управление на Шофьори
              </button>
            </div>

            {currentView === 'clients' ? (
              <div className="inline-flex rounded-2xl bg-white p-2 shadow">
                <button
                  type="button"
                  onClick={() => setClientManagementTab('registry')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    clientManagementTab === 'registry'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Регистър (Картотека)
                </button>
                <button
                  type="button"
                  onClick={() => setClientManagementTab('daily')}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    clientManagementTab === 'daily'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Дневен списък
                </button>
              </div>
            ) : null}
          </nav>
        </header>

        {isMasterAdmin && currentView === 'admins' ? (
          <AdminAdminsManagementView
            admins={admins}
            adminsLoading={adminsLoading}
            adminsError={adminsError}
            adminSubmitting={adminSubmitting}
            adminDeletingId={adminDeletingId}
            adminForm={adminForm}
            onAdminInputChange={handleAdminInputChange}
            onSubmit={event => void handleAddAdmin(event)}
            onDeleteAdmin={adminId => void handleDeleteAdmin(adminId)}
          />
        ) : null}

        {currentView === 'clients' && clientManagementTab === 'registry' ? (
          <AdminRegistryView
            registryForm={registryForm}
            registryEditingId={registryEditingId}
            registrySubmitting={registrySubmitting}
            registryError={registryError}
            entries={sortedRegistryEntries}
            registryLoading={registryLoading}
            registryDeletingId={registryDeletingId}
            registryAddressSuggestions={registryAddressSuggestions}
            showRegistryAddressSuggestions={showRegistryAddressSuggestions}
            onShowRegistryAddressSuggestions={setShowRegistryAddressSuggestions}
            onSelectRegistryAddressSuggestion={handleSelectRegistryAddressSuggestion}
            onRegistryInputChange={handleRegistryInputChange}
            onSubmit={event => void handleSubmitRegistryEntry(event)}
            onReset={resetRegistryForm}
            onEdit={handleEditRegistryEntry}
            onDelete={entryId => void handleRemoveRegistryEntry(entryId)}
            onViewProfile={entry => void handleOpenProfile(entry)}
          />
        ) : null}

        {currentView === 'clients' && clientManagementTab === 'daily' ? (
          <AdminDailyListView
            totalClientsToday={totalClientsToday}
            totalPortionsToday={totalPortionsToday}
            remainingDeliveriesToday={remainingDeliveriesToday}
            activeSosCount={activeSosCount}
            profileSearch={profileSearch}
            setProfileSearch={setProfileSearch}
            isProfileSearchOpen={isProfileSearchOpen}
            setIsProfileSearchOpen={setIsProfileSearchOpen}
            profileSearchResults={profileSearchResults}
            onSelectProfileSearch={handleSelectProfileSearch}
            scheduleItems={scheduleItems}
            clients={clients}
            drivers={drivers}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            registrySearch={registrySearch}
            selectedRegistryEntryId={selectedRegistryEntryId}
            registrySuggestions={registrySuggestions}
            onRegistrySearchChange={value => {
              setRegistrySearch(value);
              setSelectedRegistryEntryId(null);
            }}
            onRegistrySelect={applyRegistrySelection}
            onRegistryClear={() => {
              setSelectedRegistryEntryId(null);
              setRegistrySearch('');
              setClientForm(prev => ({ ...prev, egn: '' }));
            }}
            clientForm={clientForm}
            onClientInputChange={handleClientInputChange}
            driversLoading={driversLoading}
            clientSubmitting={clientSubmitting}
            clientsError={clientsError}
            onSubmitClient={event => void handleAddClient(event)}
            onAddForToday={() => void handleAddClientForSelectedDate()}
            clientsLoading={clientsLoading}
            clientDeletingId={clientDeletingId}
            reportGenerating={reportGenerating}
            onGenerateMonthlyReport={() => void handleGenerateMonthlyReport()}
            onDeleteClient={clientId => void handleDeleteClient(clientId)}
            formatNextVisitDate={formatNextVisitDate}
            renderLastCheckInStatus={renderLastCheckInStatus}
            onOpenSignaturePreview={handleOpenSignaturePreview}
          />
        ) : null}

        {currentView === 'drivers' ? (
          <AdminDriversView
            cityData={CITY_DATA}
            drivers={drivers}
            driversLoading={driversLoading}
            driversError={driversError}
            driverSubmitting={driverSubmitting}
            driverDeletingId={driverDeletingId}
            driverForm={driverForm}
            onDriverInputChange={handleDriverInputChange}
            onDriverCityChange={handleDriverCityChange}
            onSubmit={event => void handleAddDriver(event)}
            onDeleteDriver={driverId => void handleDeleteDriver(driverId)}
          />
        ) : null}

        <UserProfileModal
          isOpen={isProfileModalOpen}
          entry={profileEntry}
          history={profileHistory}
          isLoading={profileLoading}
          errorMessage={profileError}
          onClose={handleCloseProfile}
        />
      </div>
    </main>
  );
}
