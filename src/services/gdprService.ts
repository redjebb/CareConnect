import { collection, doc, getDocs, query, where, writeBatch, DocumentReference, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Firestore `in` queries accept at most 10 values.
const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const SIGNATURE_FIELDS = ['driverSignature', 'clientSignature', 'lastSignature'];

// Signatures are large base64 images: the export records that they exist
// instead of embedding them, keeping the file readable.
const stripSignatures = (data: Record<string, unknown>) => {
  const copy: Record<string, unknown> = { ...data };
  for (const field of SIGNATURE_FIELDS) {
    if (copy[field]) copy[field] = '[подпис съхранен]';
  }
  return copy;
};

const serialise = (value: unknown): unknown => {
  if (value && typeof value === 'object') {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') return maybeTimestamp.toDate().toISOString();
    if (Array.isArray(value)) return value.map(serialise);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialise(v)]));
  }
  return value;
};

interface PersonRecords {
  registry: DocumentReference[];
  clients: DocumentReference[];
  clientIds: string[];
  history: DocumentReference[];
  schedule: DocumentReference[];
  incidents: DocumentReference[];
}

async function collectPersonRecords(registryId: string, egn: string): Promise<PersonRecords> {
  const clientsSnap = egn ? await getDocs(query(collection(db, 'clients'), where('egn', '==', egn))) : null;
  const clientIds = clientsSnap ? clientsSnap.docs.map(d => d.id) : [];

  const historySnap = egn ? await getDocs(query(collection(db, 'deliveryHistory'), where('egn', '==', egn))) : null;

  const byClientId = async (name: 'schedule' | 'incidents') => {
    const refs: DocumentReference[] = [];
    for (const ids of chunk(clientIds, 10)) {
      const snap = await getDocs(query(collection(db, name), where('clientId', 'in', ids)));
      snap.docs.forEach(d => refs.push(d.ref));
    }
    return refs;
  };

  return {
    registry: [doc(db, 'clients_registry', registryId)],
    clients: clientsSnap ? clientsSnap.docs.map(d => d.ref) : [],
    clientIds,
    history: historySnap ? historySnap.docs.map(d => d.ref) : [],
    schedule: await byClientId('schedule'),
    incidents: await byClientId('incidents')
  };
}

// GDPR Art. 15/20: everything stored about one person, as a portable JSON object.
export async function exportPersonData(registryId: string, egn: string) {
  const records = await collectPersonRecords(registryId, egn);
  const read = async (refs: DocumentReference[]) =>
    Promise.all(
      refs.map(async ref => {
        const snap = await getDoc(ref);
        return { id: ref.id, ...(serialise(stripSignatures(snap.data() ?? {})) as object) };
      })
    );

  return {
    exportedAt: new Date().toISOString(),
    subjectEgn: egn,
    registry: await read(records.registry),
    visits: await read(records.clients),
    deliveryHistory: await read(records.history),
    schedule: await read(records.schedule),
    incidents: await read(records.incidents)
  };
}

// GDPR Art. 17: removes the registry entry and every record that references the person.
export async function erasePersonData(registryId: string, egn: string): Promise<number> {
  const records = await collectPersonRecords(registryId, egn);
  const all = [
    ...records.incidents,
    ...records.schedule,
    ...records.history,
    ...records.clients,
    ...records.registry
  ];

  for (const part of chunk(all, 400)) {
    const batch = writeBatch(db);
    part.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
  return all.length;
}
