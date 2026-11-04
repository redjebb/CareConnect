// Dumps every top-level Firestore collection (and the Auth user list) to
// backups/<timestamp>.json so the migration can be undone by hand.
// Credentials: GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>
import { mkdirSync, writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.GCLOUD_PROJECT ?? 'careconnect-d7bd7';
initializeApp({ projectId });
const db = getFirestore();

const dump = { projectId, takenAt: new Date().toISOString(), auth: [], collections: {} };

let pageToken;
do {
  const page = await getAuth().listUsers(1000, pageToken);
  dump.auth.push(...page.users.map(u => ({ uid: u.uid, email: u.email, disabled: u.disabled })));
  pageToken = page.pageToken;
} while (pageToken);

for (const collection of await db.listCollections()) {
  const snap = await collection.get();
  dump.collections[collection.id] = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
}

mkdirSync('backups', { recursive: true });
const file = `backups/${projectId}-${dump.takenAt.replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify(dump, null, 2));
const counts = Object.entries(dump.collections).map(([name, docs]) => `${name}: ${Object.keys(docs).length}`);
console.log(`Backup written to ${file}\nAuth users: ${dump.auth.length}\n${counts.join('\n')}`);
