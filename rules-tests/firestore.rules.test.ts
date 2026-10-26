import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, test } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const MASTER = { uid: 'master', email: 'redjebtudjar@gmail.com' };
const MANAGER = { uid: 'mgr1', email: 'manager@test.bg' };
const DRIVER_A = { uid: 'uidA', email: 'a@test.bg' };
const DRIVER_B = { uid: 'uidB', email: 'b@test.bg' };
const STRANGER = { uid: 'stranger', email: 'stranger@test.bg' };

const ctx = (u: { uid: string; email: string }) =>
  env.authenticatedContext(u.uid, { email: u.email }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-careconnect',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'users/master'), { role: 'MASTER_ADMIN', email: MASTER.email });
    await setDoc(doc(db, 'users/mgr1'), { role: 'MANAGER', email: MANAGER.email });
    await setDoc(doc(db, 'users/uidA'), { role: 'DRIVER', driverId: 'drvA', email: DRIVER_A.email });
    await setDoc(doc(db, 'users/uidB'), { role: 'DRIVER', driverId: 'drvB', email: DRIVER_B.email });
    await setDoc(doc(db, 'drivers/drvA'), { name: 'A', email: DRIVER_A.email, status: 'active' });
    await setDoc(doc(db, 'drivers/drvB'), { name: 'B', email: DRIVER_B.email, status: 'active' });
    await setDoc(doc(db, 'clients/c1'), { name: 'Иван', egn: '1111111111', assignedDriverId: 'drvA', notes: '' });
    await setDoc(doc(db, 'clients/c2'), { name: 'Мария', egn: '2222222222', assignedDriverId: 'drvB', notes: '' });
    await setDoc(doc(db, 'schedule/s1'), { clientId: 'c1', driverId: 'drvA' });
    await setDoc(doc(db, 'schedule/s2'), { clientId: 'c2', driverId: 'drvB' });
    await setDoc(doc(db, 'clients_registry/r1'), { egn: '1111111111', name: 'Иван', notes: '' });
    await setDoc(doc(db, 'invitations/new@test.bg'), {
      email: 'new@test.bg', role: 'DRIVER', driverId: 'drvNew', token: 'secret-token', status: 'pending'
    });
    await setDoc(doc(db, 'drivers/drvNew'), { name: 'New', email: 'new@test.bg', status: 'pending' });
  });
});

describe('anonymous and role-less users', () => {
  test('anonymous cannot read anything', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'clients/c1')));
    await assertFails(getDoc(doc(db, 'invitations/new@test.bg')));
    await assertFails(getDocs(collection(db, 'drivers')));
  });

  test('signed-in user without a profile has no access', async () => {
    const db = ctx(STRANGER);
    await assertFails(getDocs(collection(db, 'clients')));
    await assertFails(getDoc(doc(db, 'clients_registry/r1')));
    await assertFails(addDoc(collection(db, 'clients'), { name: 'x' }));
  });

  test('cannot self-assign a role', async () => {
    const db = ctx(STRANGER);
    await assertFails(setDoc(doc(db, 'users/stranger'), { uid: 'stranger', email: STRANGER.email, role: 'MASTER_ADMIN' }));
    await assertFails(setDoc(doc(db, 'users/stranger'), { uid: 'stranger', email: STRANGER.email, role: 'MANAGER' }));
  });
});

describe('invitation claim', () => {
  const NEW = { uid: 'newUid', email: 'new@test.bg' };
  const claim = (over: Record<string, unknown> = {}) => ({
    uid: NEW.uid, email: NEW.email, role: 'DRIVER', driverId: 'drvNew', inviteToken: 'secret-token',
    createdAt: 'now', ...over
  });

  test('valid token creates profile', async () => {
    await assertSucceeds(setDoc(doc(ctx(NEW), 'users/newUid'), claim()));
  });

  test('wrong token is refused', async () => {
    await assertFails(setDoc(doc(ctx(NEW), 'users/newUid'), claim({ inviteToken: 'guess' })));
  });

  test('cannot escalate role through a driver invitation', async () => {
    await assertFails(setDoc(doc(ctx(NEW), 'users/newUid'), claim({ role: 'MANAGER' })));
  });

  test('cannot hijack another driver record', async () => {
    await assertFails(setDoc(doc(ctx(NEW), 'users/newUid'), claim({ driverId: 'drvA' })));
  });

  test('someone with another e-mail cannot use the invitation', async () => {
    await assertFails(setDoc(doc(ctx(STRANGER), 'users/stranger'), claim({ uid: 'stranger', email: STRANGER.email })));
  });

  test('token is unreadable for the invitee', async () => {
    await assertFails(getDoc(doc(ctx(NEW), 'invitations/new@test.bg')));
  });

  test('already accepted invitation cannot be reused', async () => {
    await env.withSecurityRulesDisabled(async c => {
      await updateDoc(doc(c.firestore(), 'invitations/new@test.bg'), { status: 'accepted' });
    });
    await assertFails(setDoc(doc(ctx(NEW), 'users/newUid'), claim()));
  });

  test('after claim the invitee can activate only their own record', async () => {
    const db = ctx(NEW);
    await setDoc(doc(db, 'users/newUid'), claim());
    await assertSucceeds(updateDoc(doc(db, 'drivers/drvNew'), { status: 'active', uid: 'newUid' }));
    await assertFails(updateDoc(doc(db, 'drivers/drvA'), { status: 'active', uid: 'newUid' }));
    await assertFails(updateDoc(doc(db, 'drivers/drvNew'), { name: 'Renamed', status: 'active', uid: 'newUid' }));
  });

  test('only master can invite managers', async () => {
    const data = { email: 'm2@test.bg', role: 'MANAGER', token: 't', status: 'pending' };
    await assertFails(setDoc(doc(ctx(MANAGER), 'invitations/m2@test.bg'), data));
    await assertSucceeds(setDoc(doc(ctx(MASTER), 'invitations/m2@test.bg'), data));
  });
});

describe('driver isolation', () => {
  test('driver reads only own clients', async () => {
    const db = ctx(DRIVER_A);
    await assertSucceeds(getDoc(doc(db, 'clients/c1')));
    await assertFails(getDoc(doc(db, 'clients/c2')));
    await assertSucceeds(getDocs(query(collection(db, 'clients'), where('assignedDriverId', '==', 'drvA'))));
    await assertFails(getDocs(query(collection(db, 'clients'), where('assignedDriverId', '==', 'drvB'))));
    await assertFails(getDocs(collection(db, 'clients')));
  });

  test('driver reads only own schedule', async () => {
    const db = ctx(DRIVER_A);
    await assertSucceeds(getDocs(query(collection(db, 'schedule'), where('driverId', '==', 'drvA'))));
    await assertFails(getDocs(collection(db, 'schedule')));
  });

  test('driver can sign only fields on own client', async () => {
    const db = ctx(DRIVER_A);
    await assertSucceeds(updateDoc(doc(db, 'clients/c1'), { driverSignature: 'x', clientSignature: 'y', lastCheckIn: 'ok' }));
    await assertFails(updateDoc(doc(db, 'clients/c1'), { assignedDriverId: 'drvB' }));
    await assertFails(updateDoc(doc(db, 'clients/c1'), { name: 'hacked' }));
    await assertFails(updateDoc(doc(db, 'clients/c2'), { lastCheckIn: 'ok' }));
  });

  test('driver can update note but not beyond 500 chars', async () => {
    const db = ctx(DRIVER_A);
    await assertSucceeds(updateDoc(doc(db, 'clients/c1'), { notes: 'Етаж 3, вдясно' }));
    await assertFails(updateDoc(doc(db, 'clients/c1'), { notes: 'x'.repeat(501) }));
  });

  test('driver cannot read the registry (EGN) or users/admins', async () => {
    const db = ctx(DRIVER_A);
    await assertFails(getDoc(doc(db, 'clients_registry/r1')));
    await assertFails(getDocs(collection(db, 'users')));
    await assertFails(getDocs(collection(db, 'admins')));
    await assertFails(getDocs(collection(db, 'drivers')));
    await assertSucceeds(getDoc(doc(db, 'drivers/drvA')));
    await assertFails(getDoc(doc(db, 'drivers/drvB')));
  });

  test('driver can refresh registry notes only', async () => {
    const db = ctx(DRIVER_A);
    await assertSucceeds(updateDoc(doc(db, 'clients_registry/r1'), { notes: 'Звънец не работи', notesUpdatedAt: 'now' }));
    await assertFails(updateDoc(doc(db, 'clients_registry/r1'), { egn: '9999999999' }));
    await assertFails(deleteDoc(doc(db, 'clients_registry/r1')));
  });

  test('driver cannot create or delete clients and schedule', async () => {
    const db = ctx(DRIVER_A);
    await assertFails(addDoc(collection(db, 'clients'), { name: 'x', assignedDriverId: 'drvA' }));
    await assertFails(deleteDoc(doc(db, 'clients/c1')));
    await assertFails(addDoc(collection(db, 'schedule'), { clientId: 'c1', driverId: 'drvA' }));
  });

  test('shifts, incidents and deliveries are bound to the driver', async () => {
    const db = ctx(DRIVER_A);
    await assertSucceeds(addDoc(collection(db, 'shifts'), { driverId: 'drvA', status: 'active' }));
    await assertFails(addDoc(collection(db, 'shifts'), { driverId: 'drvB', status: 'active' }));
    await assertSucceeds(addDoc(collection(db, 'incidents'), { driverId: 'drvA', clientId: 'c1' }));
    await assertFails(addDoc(collection(db, 'incidents'), { driverId: 'drvB', clientId: 'c1' }));
    await assertSucceeds(addDoc(collection(db, 'deliveryHistory'), { driverId: 'drvA', clientId: 'c1' }));
    await assertFails(addDoc(collection(db, 'deliveryHistory'), { driverId: 'drvB', clientId: 'c1' }));
    await assertFails(getDocs(query(collection(db, 'deliveryHistory'), where('driverId', '==', 'drvB'))));
  });

  test('driver cannot resolve or delete incidents', async () => {
    const db = ctx(DRIVER_A);
    const ref = await addDoc(collection(db, 'incidents'), { driverId: 'drvA', clientId: 'c1', status: 'Open' });
    await assertFails(updateDoc(ref, { status: 'Resolved' }));
    await assertFails(deleteDoc(ref));
  });
});

describe('staff', () => {
  test('manager manages clients, schedule, drivers and registry', async () => {
    const db = ctx(MANAGER);
    await assertSucceeds(getDocs(collection(db, 'clients')));
    await assertSucceeds(addDoc(collection(db, 'clients'), { name: 'N', assignedDriverId: 'drvA' }));
    await assertSucceeds(getDocs(collection(db, 'clients_registry')));
    await assertSucceeds(getDocs(collection(db, 'drivers')));
    await assertSucceeds(addDoc(collection(db, 'schedule'), { clientId: 'c1', driverId: 'drvA' }));
    await assertSucceeds(deleteDoc(doc(db, 'clients/c2')));
  });

  test('manager cannot create admins or edit roles', async () => {
    const db = ctx(MANAGER);
    await assertFails(addDoc(collection(db, 'admins'), { email: 'x@x.bg', role: 'MANAGER' }));
    await assertFails(setDoc(doc(db, 'users/uidA'), { role: 'MASTER_ADMIN' }));
  });

  test('master can manage admins and roles', async () => {
    const db = ctx(MASTER);
    await assertSucceeds(addDoc(collection(db, 'admins'), { email: 'x@x.bg', role: 'MANAGER' }));
    await assertSucceeds(setDoc(doc(db, 'users/newone'), { role: 'DRIVER', driverId: 'drvA' }));
  });
});

describe('default deny', () => {
  test('unknown collections are closed even for master', async () => {
    await assertFails(setDoc(doc(ctx(MASTER), 'secrets/x'), { a: 1 }));
  });
});
