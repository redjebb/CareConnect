// Recreates the SHAPE of the production data before the security migration, so
// scripts/migrate-profiles.mjs can be rehearsed on the emulator.
// Includes a rogue self-assigned profile that the migration must remove.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-careconnect' });
const auth = getAuth();
const db = getFirestore();

const accounts = [
  { uid: 'a-master', email: 'redjebtudjar@gmail.com' },
  { uid: 'a-admin', email: 'Admin@careconnect-bg.me' },
  { uid: 'a-manager', email: 'manager@careconnect-bg.me' },
  { uid: 'a-driver', email: 'driver@careconnect-bg.me' },
  { uid: 'a-evil', email: 'evil@example.com' },
  { uid: 'a-nobody', email: 'nobody@example.com' }
];
for (const a of accounts) await auth.createUser({ uid: a.uid, email: a.email, password: 'Legacy12345!' });

// Legacy admin/driver records (no uid on the test accounts, as created by hand).
await db.doc('admins/x1').set({ name: 'Админ', email: 'admin@careconnect-bg.me', role: 'MASTER_ADMIN', status: 'active' });
await db.doc('admins/x2').set({ name: 'Мениджър', email: 'manager@careconnect-bg.me', role: 'MANAGER', status: 'active' });
await db.doc('drivers/d1').set({ name: 'Шофьор', email: 'driver@careconnect-bg.me', routeArea: 'София, Център', status: 'active' });
await db.doc('drivers/d2').set({ name: 'Чакащ', email: 'pending@careconnect-bg.me', routeArea: 'София, Младост', status: 'pending' });

// Legacy users documents: one wrong role, one rogue self-assigned MANAGER, one harmless USER.
await db.doc('users/a-admin').set({ uid: 'a-admin', email: 'admin@careconnect-bg.me', role: 'MANAGER' });
await db.doc('users/a-evil').set({ uid: 'a-evil', email: 'evil@example.com', role: 'MANAGER' });
await db.doc('users/a-nobody').set({ uid: 'a-nobody', email: 'nobody@example.com', role: 'USER' });

console.log('Legacy-shaped data ready.');
