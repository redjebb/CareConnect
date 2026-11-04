// One-time migration to the role-profile security model.
//
// For every Firebase Auth account it works out the correct role from the
// existing admins/drivers records and writes users/{uid} = { role, driverId }.
// Existing users/{uid} documents that cannot be justified by an admins/drivers
// record are REMOVED: under the old open rules anyone could have written an
// arbitrary role into their own document.
//
//   node scripts/migrate-profiles.mjs            -> dry run (prints the plan, changes nothing)
//   node scripts/migrate-profiles.mjs --apply    -> performs the plan
//
// Credentials: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key file
// (Firebase console -> Project settings -> Service accounts). Never commit it.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const BOOTSTRAP_MASTER_EMAIL = 'redjebtudjar@gmail.com';
const projectId = process.env.GCLOUD_PROJECT ?? 'careconnect-d7bd7';
const apply = process.argv.includes('--apply');
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

console.log(`Target project : ${projectId}${usingEmulator ? ' (EMULATOR)' : ' (LIVE)'}`);
console.log(`Mode           : ${apply ? 'APPLY – changes will be written' : 'DRY RUN – nothing is written'}\n`);

const lower = value => String(value ?? '').trim().toLowerCase();

const authUsers = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  authUsers.push(...page.users);
  pageToken = page.pageToken;
} while (pageToken);

const [adminsSnap, driversSnap, usersSnap] = await Promise.all([
  db.collection('admins').get(),
  db.collection('drivers').get(),
  db.collection('users').get()
]);

const adminsByEmail = new Map();
adminsSnap.forEach(d => adminsByEmail.set(lower(d.get('email')), { id: d.id, ...d.data() }));
const driversByEmail = new Map();
driversSnap.forEach(d => driversByEmail.set(lower(d.get('email')), { id: d.id, ...d.data() }));
const existingUsers = new Map();
usersSnap.forEach(d => existingUsers.set(d.id, d.data()));

const plan = [];
const warnings = [];
const handled = new Set();

for (const user of authUsers) {
  const email = lower(user.email);
  const admin = adminsByEmail.get(email);
  const driver = driversByEmail.get(email);
  let profile = null;

  if (email === BOOTSTRAP_MASTER_EMAIL) {
    profile = { role: 'MASTER_ADMIN', driverId: '' };
  } else if (admin) {
    profile = { role: admin.role === 'MASTER_ADMIN' ? 'MASTER_ADMIN' : 'MANAGER', driverId: '' };
    if (driver) warnings.push(`${email} has BOTH an admin and a driver record – treated as ${profile.role}.`);
  } else if (driver) {
    profile = { role: 'DRIVER', driverId: driver.id };
  }

  handled.add(user.uid);
  if (!profile) {
    warnings.push(`${email} (${user.uid}) has no admins/drivers record – will have NO ACCESS.`);
    continue;
  }

  const current = existingUsers.get(user.uid);
  const unchanged = current && current.role === profile.role && (current.driverId ?? '') === profile.driverId;
  plan.push({ action: unchanged ? 'keep' : current ? 'update' : 'create', uid: user.uid, email, ...profile, admin, driver });
}

const orphans = [...existingUsers.entries()].filter(([uid]) => !handled.has(uid) || !plan.some(p => p.uid === uid));
for (const [uid, data] of orphans) {
  plan.push({ action: 'delete', uid, email: lower(data.email), role: data.role, driverId: data.driverId ?? '' });
}

const pendingRecords = [...adminsByEmail, ...driversByEmail].filter(
  ([email]) => !authUsers.some(u => lower(u.email) === email)
);

console.table(plan.map(({ action, uid, email, role, driverId }) => ({ action, email, role, driverId, uid })));
if (pendingRecords.length) {
  console.log('\nRecords without an Auth account yet (waiting for activation, nothing to do):');
  pendingRecords.forEach(([email]) => console.log(`  - ${email}`));
}
if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach(w => console.log(`  ! ${w}`));
}

const changes = plan.filter(p => p.action !== 'keep');
console.log(`\n${changes.length} change(s) planned, ${plan.length - changes.length} already correct.`);

if (!apply) {
  console.log('Dry run finished. Re-run with --apply to perform these changes.');
  process.exit(0);
}

const batch = db.batch();
for (const item of plan) {
  const ref = db.collection('users').doc(item.uid);
  if (item.action === 'delete') {
    batch.delete(ref);
  } else if (item.action !== 'keep') {
    batch.set(ref, {
      uid: item.uid,
      email: item.email,
      role: item.role,
      driverId: item.driverId,
      migratedAt: new Date().toISOString()
    });
  }
  // Link the legacy record to its Auth account so the UI can show status "active".
  const record = item.admin ? ['admins', item.admin] : item.driver ? ['drivers', item.driver] : null;
  if (record && item.action !== 'delete' && record[1].uid !== item.uid) {
    batch.update(db.collection(record[0]).doc(record[1].id), { uid: item.uid, status: 'active' });
  }
}
await batch.commit();
console.log('Done. Run the script again without --apply: it should now report 0 changes.');
