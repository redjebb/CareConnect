// Seeds the local Firebase emulators with a realistic, entirely fake data set.
// Used by `npm run demo` and handy as an offline fallback during the defence.
//
// Demo accounts (emulator only, never exist in production):
//   master@demo.bg / Demo12345!   – MASTER_ADMIN
//   manager@demo.bg / Demo12345!  – MANAGER
//   driver@demo.bg / Demo12345!   – DRIVER (route "София, Лозенец")
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

initializeApp({ projectId: 'demo-careconnect' });
const auth = getAuth();
const db = getFirestore();

const PASSWORD = 'Demo12345!';
const today = new Date();
const dayKey = offset => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const at = (offset, hour) =>
  Timestamp.fromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, hour, 15));

const accounts = [
  { uid: 'u-master', email: 'master@demo.bg', role: 'MASTER_ADMIN' },
  { uid: 'u-manager', email: 'manager@demo.bg', role: 'MANAGER' },
  { uid: 'u-driver', email: 'driver@demo.bg', role: 'DRIVER', driverId: 'drv-ivan' },
  { uid: 'u-driver2', email: 'driver2@demo.bg', role: 'DRIVER', driverId: 'drv-maria' }
];

for (const account of accounts) {
  await auth.createUser({ uid: account.uid, email: account.email, password: PASSWORD, emailVerified: true });
  await db.doc(`users/${account.uid}`).set({
    uid: account.uid,
    email: account.email,
    role: account.role,
    driverId: account.driverId ?? '',
    createdAt: new Date().toISOString()
  });
}

await db.doc('admins/adm-master').set({ name: 'Главен администратор', email: 'master@demo.bg', role: 'MASTER_ADMIN', status: 'active', uid: 'u-master' });
await db.doc('admins/adm-manager').set({ name: 'Елена Диспечер', email: 'manager@demo.bg', role: 'MANAGER', status: 'active', uid: 'u-manager' });

await db.doc('drivers/drv-ivan').set({ name: 'Иван Петров', email: 'driver@demo.bg', phone: '0888123456', routeArea: 'София, Лозенец', status: 'active', role: 'DRIVER', uid: 'u-driver' });
await db.doc('drivers/drv-maria').set({ name: 'Мария Георгиева', email: 'driver2@demo.bg', phone: '0888654321', routeArea: 'София, Младост', status: 'active', role: 'DRIVER', uid: 'u-driver2' });

const people = [
  { id: 'reg-1', egn: '7523169263', name: 'Стоян Димитров', address: 'бул. Черни връх 47, София', phone: '0887111111', notes: 'Качете се на 3-ти етаж, вратата е вдясно. Звънецът не работи – чукайте.', meals: 1 },
  { id: 'reg-2', egn: '6801010011', name: 'Райна Колева', address: 'ул. Нова 12, София', phone: '0887222222', notes: 'Оставете на съседката, ако не отвори (ап. 4).', meals: 2 },
  { id: 'reg-3', egn: '7002020022', name: 'Георги Василев', address: 'ул. Незабравка 5, София', phone: '0887333333', notes: '', meals: 1 },
  { id: 'reg-4', egn: '6503030033', name: 'Надя Христова', address: 'бул. Цар Борис III 100, София', phone: '0887444444', notes: 'Кучето е в двора – обадете се по телефона преди входа.', meals: 1 }
];

for (const person of people) {
  await db.doc(`clients_registry/${person.id}`).set({
    egn: person.egn, name: person.name, address: person.address, phone: person.phone,
    defaultMealType: 'Стандартно меню', defaultMealCount: person.meals, notes: person.notes
  });
}

// Today's visits (one client document per visit, as in the real app).
const todayVisits = [
  { id: 'cl-1', reg: people[0], driver: 'drv-ivan' },
  { id: 'cl-2', reg: people[1], driver: 'drv-ivan' },
  { id: 'cl-3', reg: people[2], driver: 'drv-ivan' },
  { id: 'cl-4', reg: people[3], driver: 'drv-maria' }
];
for (const visit of todayVisits) {
  await db.doc(`clients/${visit.id}`).set({
    egn: visit.reg.egn, name: visit.reg.name, address: visit.reg.address, phone: visit.reg.phone,
    notes: visit.reg.notes, registryId: visit.reg.id, assignedDriverId: visit.driver,
    mealType: 'Стандартно меню', mealCount: visit.reg.meals, lastCheckIn: ''
  });
  await db.doc(`schedule/sch-${visit.id}`).set({
    clientId: visit.id, driverId: visit.driver, date: dayKey(0),
    assignedByAdminEmail: 'manager@demo.bg', createdAt: Timestamp.now()
  });
}

// Two weeks of history for the analytics tab (deterministic pseudo-random).
let seed = 7;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const issueTypes = ['Не отваря', 'Липсва адрес', 'Отказ от храна', 'Лошо състояние'];
let n = 0;
for (let offset = -14; offset <= -1; offset++) {
  for (const driver of [{ id: 'drv-ivan', name: 'Иван Петров' }, { id: 'drv-maria', name: 'Мария Георгиева' }]) {
    const count = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const person = people[Math.floor(rand() * people.length)];
      const isIssue = rand() < 0.12;
      await db.doc(`deliveryHistory/h-${n++}`).set({
        clientId: `old-${n}`, clientName: person.name, egn: person.egn,
        driverId: driver.id, driverName: driver.name,
        status: isIssue ? 'issue' : 'success',
        mealCount: isIssue ? 0 : person.meals,
        ...(isIssue ? { issueType: issueTypes[Math.floor(rand() * issueTypes.length)] } : {}),
        timestamp: at(offset, 9 + i)
      });
    }
  }
}

// One missed visit (planned yesterday, nothing delivered) to showcase the alert.
await db.doc('clients/cl-missed').set({
  egn: people[2].egn, name: people[2].name, address: people[2].address, phone: people[2].phone,
  notes: '', registryId: 'reg-3', assignedDriverId: 'drv-ivan', mealType: 'Стандартно меню', mealCount: 1, lastCheckIn: ''
});
await db.doc('schedule/sch-missed').set({
  clientId: 'cl-missed', driverId: 'drv-ivan', date: dayKey(-1), assignedByAdminEmail: 'manager@demo.bg', createdAt: Timestamp.now()
});

console.log('Demo data ready. Accounts: master@demo.bg, manager@demo.bg, driver@demo.bg, driver2@demo.bg – password Demo12345!');
