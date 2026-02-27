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


  import { useState, useEffect } from 'react';
  import { useAdminData } from '../hooks/useAdminData';
  import AdminDailyListView from './AdminDailyListView';
  import AdminDriversView from './AdminDriversView';
  import AdminAdminsManagementView from './AdminAdminsManagementView';
  import AdminRegistryView from './AdminRegistryView';
  import UserProfileModal from '../components/UserProfileModal';
  import SignatureViewerModal from '../components/SignatureViewerModal';
  import { collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
  import { db } from '../services/firebase';
  import DriverProfileModal from '../components/DriverProfileModal'; 
  import { getFriendlyErrorMessage } from '../services/authService';
  import { LogOut, LayoutDashboard, Users, Truck, ShieldCheck, Database, CalendarDays, FileText } from 'lucide-react';
  import type { Driver, ClientRegistryEntry } from '../types';
  import GlobalMonthlyReportModal from '../components/GlobalMonthlyReportModal';

  interface AdminDashboardProps {
    userEmail: string;
    isMasterAdmin: boolean;
    onLogout: () => Promise<void> | void;
  }

  const CITY_DATA: Record<string, string[]> = {
    София: ['Средец', 'Красно село', 'Възраждане', 'Оборище', 'Сердика', 'Подуяне', 'Слатина', 'Изгрев', 'Лозенец', 'Триадица', 'Красна поляна', 'Илинден', 'Надежда', 'Искър', 'Младост', 'Студентски', 'Витоша', 'Овча купел', 'Люлин', 'Връбница', 'Нови Искър', 'Кремиковци', 'Панчарево', 'Банкя'],
    Пловдив: ['Централен', 'Тракия', 'Южен', 'Северен', 'Западен', 'Източен'],
    Варна: ['Одесос', 'Приморски', 'Младост', 'Вл. Варненчик', 'Аспарухово']
  };

  export default function AdminDashboard({ userEmail, isMasterAdmin, onLogout }: AdminDashboardProps) {
    const adminData = useAdminData(isMasterAdmin);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [isPrinting, setIsPrinting] = useState(false); // <--- Ново състояние

    const [isSigModalOpen, setIsSigModalOpen] = useState(false);
    const [selectedSigData, setSelectedSigData] = useState<{
      clientName: string;
      client: string;
      driver: string;
    }>({ clientName: '', client: '', driver: '' });

    const [isDriverProfileOpen, setIsDriverProfileOpen] = useState(false);
    const [isGlobalReportOpen, setIsGlobalReportOpen] = useState(false);
    const [selectedDriverForProfile, setSelectedDriverForProfile] = useState<any>(null);

    const {
      currentView, setCurrentView,
      clientManagementTab, setClientManagementTab,
      isProfileModalOpen, profileEntry, profileHistory, profileLoading, profileError, handleCloseProfile,
      totalClientsToday, totalPortionsToday, remainingDeliveriesToday, activeSosCount,
      scheduleItems, clients, drivers, selectedDate, handleDateChange,
      registrySearch, selectedRegistryEntryId, registrySuggestions, setRegistrySearch, setSelectedRegistryEntryId, applyRegistrySelection,
      clientForm, setClientForm, handleClientInputChange, driversLoading, clientSubmitting, clientsError,
      handleAddClient, handleAddClientForSelectedDate, clientsLoading, clientDeletingId, reportGenerating, handleGenerateMonthlyReport, handleDeleteClient,
      registryForm, registryEditingId, registrySubmitting, registryError, sortedRegistryEntries, registryLoading, registryDeletingId,
      registryAddressSuggestions, showRegistryAddressSuggestions, setShowRegistryAddressSuggestions,
      handleSelectRegistryAddressSuggestion, handleRegistryInputChange, handleSubmitRegistryEntry, resetRegistryForm, handleEditRegistryEntry, handleRemoveRegistryEntry, handleOpenProfile,
      driversError, driverSubmitting, driverDeletingId, driverForm, handleDriverInputChange, handleDriverCityChange, handleAddDriver, handleDeleteDriver,
      admins, adminsLoading, adminsError, adminSubmitting, adminDeletingId, adminForm, handleAdminInputChange, handleAddAdmin, handleDeleteAdmin,
      profileSearch, setProfileSearch, isProfileSearchOpen, setIsProfileSearchOpen, profileSearchResults, handleSelectProfileSearch
    } = adminData;

    useEffect(() => {
      const unsubscribe = onSnapshot(collection(db, 'invitations'), (snapshot) => {
        setInvitations(snapshot.docs.map(doc => doc.data()));
      });
      return () => unsubscribe();
    }, []);

    const sendInvite = async (email: string, role: 'driver' | 'manager') => {
      const token = crypto.randomUUID();
      await addDoc(collection(db, 'invitations'), {
        email: email.trim(),
        role: role,
        token: token,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    };

    const handleGenerateOfficialReport = () => {
    setIsGlobalReportOpen(true);
    };

    const handleQuickSchedule = (entry: ClientRegistryEntry) => {
      handleCloseProfile(); 
      setClientManagementTab('daily');
      setClientForm({
        egn: entry.egn,
        name: entry.name,
        address: entry.address,
        phone: entry.phone || '',
        notes: '',
        assignedDriverId: '', 
        serviceDate: new Date().toISOString().split('T')[0], 
        mealType: entry.defaultMealType || 'Основно',
        mealCount: String(entry.defaultMealCount || '1'),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleOpenSignaturePreview = (item: any) => {
      setSelectedSigData({
        clientName: item.name || item.clientName || 'Неизвестен клиент',
        client: item.clientSignature || item.lastSignature || '',
        driver: item.driverSignature || ''
      });
      setIsSigModalOpen(true);
    };

    const handleOpenDriverProfile = (driver: any) => {
      setSelectedDriverForProfile(driver);
      setIsDriverProfileOpen(true);
    };

    const translatedAdminsError = adminsError ? getFriendlyErrorMessage(adminsError) : null;
    const translatedRegistryError = registryError ? getFriendlyErrorMessage(registryError) : null;
    const translatedClientsError = clientsError ? getFriendlyErrorMessage(clientsError) : null;
    const translatedDriversError = driversError ? getFriendlyErrorMessage(driversError) : null;
    const translatedProfileError = profileError ? getFriendlyErrorMessage(profileError) : null;

    return (
      <main className="min-h-screen bg-[#F8FAFC] pb-20">
        
        {!isPrinting && ( // <--- Обвиваме всичко, за да не се показва при печат
          <>
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <h1 className="text-base font-black text-slate-900 leading-tight">CareConnect</h1>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Админ Панел</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden flex-col items-end sm:flex">
                      <span className="text-xs font-bold text-slate-900">{userEmail}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                      {isMasterAdmin ? 'Системен администратор' : 'Оперативен мениджър'}
                  </span>
                    </div>
                    <button
                      onClick={() => void onLogout()}
                      className="group flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Изход</span>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
              <nav className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="inline-flex rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200 w-full lg:w-auto">
                  {isMasterAdmin && (
                    <button
                      onClick={() => setCurrentView('admins')}
                      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                        currentView === 'admins' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" /> Мениджъри
                    </button>
                  )}
                  <button
                    onClick={() => setCurrentView('clients')}
                    className={`flex flex-1 lg:flex-none items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                      currentView === 'clients' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Клиенти
                  </button>
                  <button
                    onClick={() => setCurrentView('drivers')}
                    className={`flex flex-1 lg:flex-none items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                      currentView === 'drivers' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" /> Шофьори
                  </button>
                </div>

                {currentView === 'clients' && (
                  <div className="flex flex-wrap items-center gap-3 self-center lg:self-auto uppercase">
                    <div className="inline-flex rounded-2xl bg-slate-200/50 p-1">
                      <button
                        onClick={() => setClientManagementTab('registry')}
                        className={`flex items-center gap-2 rounded-xl px-6 py-2 text-xs font-black uppercase tracking-tighter transition-all ${
                          clientManagementTab === 'registry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" /> Картотека
                      </button>
                      <button
                        onClick={() => setClientManagementTab('daily')}
                        className={`flex items-center gap-2 rounded-xl px-6 py-2 text-xs font-black uppercase tracking-tighter transition-all ${
                          clientManagementTab === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        <CalendarDays className="w-3.5 h-3.5" /> Дневен График
                      </button>
                    </div>
                    
                    {/* БУТОН ЗА МЕСЕЧЕН ОТЧЕТ */}
                    <button
                      onClick={handleGenerateOfficialReport}
                      className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm hover:bg-blue-50 transition-all active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5" /> Месечен отчет
                    </button>
                  </div>
                )}
              </nav>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isMasterAdmin && currentView === 'admins' && (
                  <AdminAdminsManagementView
                    admins={admins}
                    invitations={invitations}
                    adminsLoading={adminsLoading}
                    adminsError={translatedAdminsError}
                    adminSubmitting={adminSubmitting}
                    adminDeletingId={adminDeletingId}
                    adminForm={adminForm}
                    onAdminInputChange={handleAdminInputChange}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await handleAddAdmin(e);
                      if (adminForm.email) await sendInvite(adminForm.email, 'manager');
                    }}
                    onDeleteAdmin={id => void handleDeleteAdmin(id)}
                  />
                )}

                {currentView === 'clients' && clientManagementTab === 'registry' && (
                  <AdminRegistryView
                    registryForm={registryForm}
                    registryEditingId={registryEditingId}
                    registrySubmitting={registrySubmitting}
                    registryError={translatedRegistryError}
                    entries={sortedRegistryEntries}
                    registryLoading={registryLoading}
                    registryDeletingId={registryDeletingId}
                    registryAddressSuggestions={registryAddressSuggestions}
                    showRegistryAddressSuggestions={showRegistryAddressSuggestions}
                    onShowRegistryAddressSuggestions={setShowRegistryAddressSuggestions}
                    onSelectRegistryAddressSuggestion={handleSelectRegistryAddressSuggestion}
                    onRegistryInputChange={handleRegistryInputChange}
                    onSubmit={e => void handleSubmitRegistryEntry(e)}
                    onReset={resetRegistryForm}
                    onEdit={handleEditRegistryEntry}
                    onDelete={id => void handleRemoveRegistryEntry(id)}
                    onViewProfile={entry => void handleOpenProfile(entry)}
                  />
                )}

                {currentView === 'clients' && clientManagementTab === 'daily' && (
                  <AdminDailyListView
                    totalClientsToday={totalClientsToday}
                    totalPortionsToday={totalPortionsToday}
                    remainingDeliveriesToday={remainingDeliveriesToday}
                    activeSosCount={activeSosCount}
                    scheduleItems={scheduleItems}
                    clients={clients}
                    drivers={drivers}
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    registrySearch={registrySearch}
                    selectedRegistryEntryId={selectedRegistryEntryId}
                    registrySuggestions={registrySuggestions}
                    onRegistrySearchChange={value => { setRegistrySearch(value); setSelectedRegistryEntryId(null); }}
                    onRegistrySelect={applyRegistrySelection}
                    onRegistryClear={() => { setSelectedRegistryEntryId(null); setRegistrySearch(''); setClientForm(p => ({ ...p, egn: '' })); }}
                    clientForm={clientForm}
                    onClientInputChange={handleClientInputChange}
                    driversLoading={driversLoading}
                    clientSubmitting={clientSubmitting}
                    clientsError={translatedClientsError}
                    onSubmitClient={e => void handleAddClient(e)}
                    onAddForToday={() => void handleAddClientForSelectedDate()}
                    clientsLoading={clientsLoading}
                    clientDeletingId={clientDeletingId}
                    onDeleteClient={id => void handleDeleteClient(id)}
                    formatNextVisitDate={(v) => v ? new Date(v).toLocaleDateString('bg-BG') : 'Няма'}
                    renderLastCheckInStatus={(l) => <span>{l || 'Няма'}</span>}
                    onOpenSignaturePreview={handleOpenSignaturePreview}
                    onViewProfile={handleOpenProfile}
                  />
                )}

                <GlobalMonthlyReportModal 
                isOpen={isGlobalReportOpen}
                onClose={() => setIsGlobalReportOpen(false)}
                adminEmail={userEmail}
                />

                {currentView === 'drivers' && (
                  <AdminDriversView
                    cityData={CITY_DATA}
                    drivers={drivers}
                    invitations={invitations}
                    driversLoading={driversLoading}
                    driversError={translatedDriversError}
                    driverSubmitting={driverSubmitting}
                    driverDeletingId={driverDeletingId}
                    driverForm={driverForm}
                    onDriverInputChange={handleDriverInputChange}
                    onDriverCityChange={handleDriverCityChange}
                    onViewProfile={handleOpenDriverProfile}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await handleAddDriver(e);
                      if (driverForm.email) await sendInvite(driverForm.email, 'driver');
                    }}
                    onDeleteDriver={id => void handleDeleteDriver(id)}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* --- ОФИЦИАЛЕН МЕСЕЧЕН ОТЧЕТ (ВИЖДА СЕ САМО ПРИ ПРИНТИРАНЕ) --- */}
        {isPrinting && (
          <div className="bg-white p-12 text-black min-h-screen font-serif">
            <div className="max-w-4xl mx-auto border border-gray-400 p-10">
              <div className="flex justify-between border-b-2 border-black pb-4 mb-6 uppercase text-sm font-bold">
                <div>
                  <p>Община CareConnect</p>
                  <p>Домашен Социален Патронаж</p>
                </div>
                <div className="text-right">
                  <p>Месечен отчет за дейността</p>
                  <p>Дата: {new Date().toLocaleDateString('bg-BG')} г.</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-center underline uppercase mb-8 decoration-1 underline-offset-4">
                Официален отчет на социалните услуги
              </h1>

              <div className="grid grid-cols-2 border border-black mb-8">
                <div className="p-4 border-r border-black space-y-2 text-sm font-bold uppercase italic tracking-tighter">
                  <p>Общо потребители: {sortedRegistryEntries.length}</p>
                  <p>Изпълнени доставки (месец): {totalPortionsToday * 21}</p>
                  <p className="text-red-700">SOS Сигнали: {activeSosCount}</p>
                </div>
                <div className="p-4 text-xs italic">
                  <p className="font-bold not-italic mb-1 underline uppercase">Забележка:</p>
                  Данните са генерирани автоматично и включват потвърдени доставки с цифров подпис.
                </div>
              </div>

              <table className="w-full border-collapse border border-black mb-10 text-sm">
                <thead>
                  <tr className="bg-gray-100 uppercase text-xs">
                    <th className="border border-black p-2 text-left">Служител</th>
                    <th className="border border-black p-2 text-center">Район</th>
                    <th className="border border-black p-2 text-center font-black italic uppercase">Заетост (месец)</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(driver => (
                    <tr key={driver.id}>
                      <td className="border border-black p-2 font-bold">{driver.name}</td>
                      <td className="border border-black p-2 text-center">{driver.routeArea || 'Централен'}</td>
                      <td className="border border-black p-2 text-center font-black">168.00 ч.</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between mt-20 text-sm italic">
                <div className="text-center w-56 border-t border-black pt-2">
                  <p>Изготвил: {userEmail}</p>
                </div>
                <div className="text-center w-56 border-t border-black pt-2 font-bold uppercase">
                  <p>Място за печат (М.П.)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODALS - Показват се само ако не принтираме */}
        {!isPrinting && (
          <>
            <UserProfileModal
              isOpen={isProfileModalOpen}
              entry={profileEntry}
              history={profileHistory}
              onQuickSchedule={handleQuickSchedule}
              isLoading={profileLoading}
              errorMessage={translatedProfileError}
              onClose={handleCloseProfile}
            />

            <DriverProfileModal 
              isOpen={isDriverProfileOpen} 
              onClose={() => setIsDriverProfileOpen(false)} 
              driver={selectedDriverForProfile} 
            />

            <SignatureViewerModal
              isOpen={isSigModalOpen}
              onClose={() => setIsSigModalOpen(false)}
              clientName={selectedSigData.clientName}
              client={selectedSigData.client}
              driver={selectedSigData.driver}
            />
          </>
        )}
      </main>
    );
  }